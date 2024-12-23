#!/usr/bin/env python
from pathlib import Path
import glob
import json
import os
import re
import shutil
import subprocess


def run_command(cmd, cwd=None):
    """运行命令并返回输出"""
    subprocess.run(cmd, cwd=cwd, shell=True)


def escape_template_literals(content):
    """转义模板字符串中的特殊字符"""
    content = content.replace('`', '\\`')
    content = re.sub(r'\$\{([\s\S]+?)\}', r'\${\1}', content)
    return content


def find_compiled_iframe_client_dir(script_dir):
    """在 src_exported 中查找包含 iframe_client 文件夹"""
    exported_dirs = glob.glob(os.path.join(script_dir, 'src_exported/**/iframe_client'), recursive=True)
    if not exported_dirs:
        print("错误: 没能在 src_exported 中找到 iframe_client 文件夹")
        exit(1)

    return exported_dirs[0]


def export_client(script_dir):
    """导出 src/iframe_client 到 src/iframe_client_exported"""
    compiled_iframe_client_dir = find_compiled_iframe_client_dir(script_dir)

    iframe_client_exported_dir = os.path.join(script_dir, 'src/iframe_client_exported')
    os.makedirs(iframe_client_exported_dir, exist_ok=True)

    stems = []

    # 将 src_exported/iframe_client/*.js 转换为 src/iframe_client_exported/*.ts
    for file in [Path(file) for file in sorted(glob.glob(os.path.join(compiled_iframe_client_dir, '*.js')))]:
        with file.open('r', encoding="utf-8") as f:
            lines = f.readlines()

            content = ''.join(lines[1:-1])
            content = escape_template_literals(content)

            file_stem = file.stem
            stems.append(file_stem)

            output_file = Path(os.path.join(iframe_client_exported_dir, f'{file_stem}.ts'))
            output_file.write_text(f'export const iframe_client_{file_stem} = `\n{content}`', encoding="utf-8")

    # 生成 src/iframe_client_exported/index.ts
    index_content = ''
    index_content += f'{''.join(f'import {{ iframe_client_{stem} }} from "./{stem}.js"\n' for stem in stems)}'
    index_content += '\n'
    index_content += 'export const iframe_client = [\n'
    index_content += f'{''.join(f'  iframe_client_{stem},\n' for stem in stems)}'
    index_content += "].join('\\n');"

    index_file = Path(os.path.join(iframe_client_exported_dir, 'index.ts'))
    index_file.write_text(index_content, encoding="utf-8")


def clean_src_exported_structure(script_dir):
    """确保 src_exported 路径正确: 如果本项目放在酒馆中, 则编译出的文件路径可能不对"""
    actual_src_exported_dir = Path(find_compiled_iframe_client_dir(script_dir)).parent
    src_exported_dir = os.path.join(script_dir, 'src_exported')
    temp_dir = os.path.join(script_dir, 'temp')

    shutil.move(actual_src_exported_dir, temp_dir)
    shutil.rmtree(src_exported_dir, ignore_errors=True)
    shutil.move(temp_dir, src_exported_dir)

    # 调整 source map
    for exported_file in [Path(file) for file in glob.glob(os.path.join(src_exported_dir, "**/*.map"), recursive=True)]:
        dir_of_exported_file = exported_file.parent
        relative_path = dir_of_exported_file.relative_to(src_exported_dir)
        origin_file = Path(os.path.join(script_dir, 'src', relative_path, exported_file.stem.replace('.js', '.ts')))

        data = []
        with exported_file.open(encoding="utf-8") as f:
            data = json.load(f)
            data["sources"] = [str(origin_file.relative_to(dir_of_exported_file, walk_up=True))]
        with exported_file.open("w", encoding="utf-8") as f:
            json.dump(data, f)
    return


if __name__ == '__main__':
    """处理 TypeScript 文件"""
    SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))

    print("移除之前可能生成的 src_exported...")
    shutil.rmtree(os.path.join(SCRIPT_DIR, 'src_exported'), ignore_errors=True)

    print("""
======================================
别忘了给 import 的相对路径文件后面加上 .js 后缀!!!
======================================
""")
    print("运行第一次 TypeScript 编译...")
    run_command('tsc -p tsconfig.json', SCRIPT_DIR)

    print("导出 src/iframe_client 到 src/iframe_client_exported...")
    export_client(SCRIPT_DIR)

    print("运行第二次 TypeScript 编译...")
    run_command('tsc -p tsconfig.json', SCRIPT_DIR)

    print("确保 src_exported 路径正确...")
    clean_src_exported_structure(SCRIPT_DIR)

    print("编译成功")
