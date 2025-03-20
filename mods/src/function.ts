//你好世界，为了测试多文件场景，分开在了不同的文件中
function hello()
{
    alert("hello");
    eventRemoveListener(tavern_events.MESSAGE_RECEIVED, hello);
}

//Side Effect
(window as any).hello = hello;
