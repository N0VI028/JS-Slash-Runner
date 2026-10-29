/** One render transaction per chat epoch, message node and input revision. */
export type RenderState = 'pending' | 'running' | 'committed' | 'invalidated';

export type RenderContext = {
  isCurrent: () => boolean;
  /** Accept synchronous DOM changes made by this transaction's preparation steps. */
  acceptChanges: () => void;
  delay: (ms?: number) => Promise<boolean>;
};

type Task<Node> = {
  epoch: number;
  id: number;
  node: Node;
  input: string;
  revision: string;
  state: RenderState;
  promise: Promise<void>;
  resolve: () => void;
  reject: (error: unknown) => void;
  cleanup: Set<() => void>;
};

export class MessageRenderCoordinator<Node extends object> {
  private epoch = 0;
  private tasks = new Map<number, Task<Node>>();

  constructor(
    private readonly isTarget: (id: number, node: Node) => boolean,
    private readonly readInput: (id: number, node: Node) => string,
    private readonly isAttached: (id: number, node: Node) => boolean = () => true,
  ) {}

  private invalidateTask(task: Task<Node>) {
    task.state = 'invalidated';
    task.cleanup.forEach(cleanup => cleanup());
    task.cleanup.clear();
    task.resolve();
  }

  invalidate() {
    this.epoch++;
    this.tasks.forEach(task => this.invalidateTask(task));
    this.tasks.clear();
  }

  request(
    id: number,
    node: Node,
    execute: (context: RenderContext) => void | Promise<void>,
    revision = '',
  ): Promise<void> {
    if (!this.isTarget(id, node)) return Promise.resolve();
    const input = this.readInput(id, node);
    const previous = this.tasks.get(id);
    if (
      previous?.node === node &&
      previous.input === input &&
      previous.revision === revision &&
      previous.state !== 'invalidated' &&
      (previous.state !== 'committed' || this.isAttached(id, node))
    ) {
      return previous.promise;
    }
    if (previous) this.invalidateTask(previous);

    let resolve!: () => void;
    let reject!: (error: unknown) => void;
    const promise = new Promise<void>((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const task: Task<Node> = {
      epoch: this.epoch,
      id,
      node,
      input,
      revision,
      state: 'pending',
      promise,
      resolve,
      reject,
      cleanup: new Set(),
    };
    // Reserve synchronously, before execute can await nextTick or a timer.
    this.tasks.set(id, task);
    const ownsTarget = () =>
      task.state !== 'invalidated' &&
      task.epoch === this.epoch &&
      this.tasks.get(id) === task &&
      this.isTarget(id, node);
    const isCurrent = () => ownsTarget() && task.input === this.readInput(id, node);
    const context: RenderContext = {
      isCurrent,
      acceptChanges: () => {
        if (ownsTarget()) task.input = this.readInput(id, node);
      },
      delay: (ms = 0) =>
        new Promise<boolean>(resume => {
          if (!isCurrent()) {
            resume(false);
            return;
          }
          const cancel = () => {
            clearTimeout(timer);
            resume(false);
          };
          const timer = setTimeout(() => {
            task.cleanup.delete(cancel);
            resume(isCurrent());
          }, ms);
          task.cleanup.add(cancel);
        }),
    };
    // Defer execution, but never defer reservation.
    void Promise.resolve()
      .then(async () => {
        if (!isCurrent()) {
          this.invalidateTask(task);
          return;
        }
        task.state = 'running';
        await execute(context);
        if (isCurrent()) {
          task.state = 'committed';
          task.resolve();
        } else {
          this.invalidateTask(task);
        }
      })
      .catch(error => {
        if (task.state === 'invalidated') return;
        task.state = 'invalidated';
        task.cleanup.forEach(cleanup => cleanup());
        task.cleanup.clear();
        if (this.tasks.get(id) === task) this.tasks.delete(id);
        task.reject(error);
      });
    return promise;
  }
}
