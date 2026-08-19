---
name: python-basics
description: Python 基础——变量/列表/字典/循环/函数/文件读写/调用 API，给从没写过 Python 的人
---

# Python 基础（附录）

这篇是给从没写过 Python 的人的——30 分钟读完，能看懂和修改基础脚本。

> 为什么智能体开发者要学 Python？因为大部分 AI 工具（LangChain、OpenAI SDK、数据清洗脚本）都是 Python 写的。天道茶寮用 TypeScript，但如果你要做数据处理、模型微调、爬虫，Python 是标配。

## 一 · Python 是什么

Python = 一门简洁的编程语言，特点是"像读英语"：

```python
# 判断一个数是不是正数
num = 5
if num > 0:
    print("正数")
else:
    print("不是正数")
```

没有花括号 `{}`，没有分号 `;`——用**缩进**（4 个空格）表示代码块。

## 二 · 变量与数据类型

### 基本类型

```python
# 字符串（文字）
title = "存在主义笔记"
name = '老胡'

# 整数
chunk_count = 65

# 浮点数（小数）
score = 0.89

# 布尔值（True / False）
is_indexed = True
is_empty = False

# None（空值，相当于 null）
author = None
```

### 字符串操作

```python
# 拼接
greeting = "你好, " + name

# 格式化（f-string，推荐）
message = f"这本书有 {chunk_count} 个 chunk，评分 {score:.2f}"

# 多行字符串
prompt = """
你是老胡，一位盲派算师。
说话直给，不绕弯。
"""

# 常用方法
text = "  天行健君子以自强不息  "
text.strip()        # 去首尾空格 → "天行健君子以自强不息"
text.strip().split()  # 分词 → ["天行健君子以自强不息"]
"天行健".replace("天", "地")  # 替换 → "地行健"
"存在主义".startswith("存在")  # True
len("天行健")        # 长度 → 3
```

## 三 · 列表（List）

列表 = 有序的、可修改的集合。

```python
# 创建
books = ["存在主义笔记", "道德经", "庄子"]
numbers = [1, 2, 3, 4, 5]

# 索引（从 0 开始）
books[0]    # "存在主义笔记"
books[-1]   # "庄子"（负数从后数）

# 修改
books[0] = "存在与虚无"

# 添加
books.append("列子")        # 加到末尾
books.insert(0, "周易")     # 加到开头

# 删除
books.remove("庄子")        # 按值删
del books[0]                # 按位置删

# 切片
books[0:2]   # 前两个 → ["周易", "存在与虚无"]
books[1:]    # 从第二个到末尾
books[:2]    # 从开头到第二个（不含）

# 长度
len(books)  # 4
```

### 列表推导式

Python 的特色——一行代码生成列表：

```python
# 传统写法
squares = []
for i in range(5):
    squares.append(i * i)

# 推导式（等价）
squares = [i * i for i in range(5)]
# [0, 1, 4, 9, 16]

# 带条件
even_squares = [i * i for i in range(10) if i % 2 == 0]
# [0, 4, 16, 36, 64]
```

## 四 · 字典（Dict）

字典 = 键值对集合，类似 JavaScript 的 Object 或 JSON。

```python
# 创建
book = {
    "title": "存在主义笔记",
    "author": None,
    "tradition": "existentialism",
    "page_count": 3
}

# 读取
book["title"]           # "存在主义笔记"
book.get("author")      # None（推荐用 get，键不存在不报错）
book.get("isbn", "未知") # "未知"（键不存在时返回默认值）

# 修改 / 添加
book["author"] = "佚名"
book["isbn"] = "978-xxx"   # 新增

# 删除
del book["isbn"]

# 遍历
for key, value in book.items():
    print(f"{key}: {value}")

# 所有键 / 所有值
book.keys()    # dict_keys(['title', 'author', 'tradition', 'page_count'])
book.values()  # dict_values(['存在主义笔记', '佚名', 'existentialism', 3])
```

### 嵌套字典

```python
# 多个角色，每个角色有配置
mentors = {
    "hu": {
        "name": "老胡",
        "tradition": "yijing",
        "style": "直给"
    },
    "xuan": {
        "name": "玄",
        "tradition": "daoism",
        "style": "不批命"
    },
    "li": {
        "name": "李",
        "tradition": "existentialism",
        "style": "面对选择"
    }
}

# 读取
mentors["hu"]["name"]  # "老胡"
```

## 五 · 循环

### for 循环

```python
# 遍历列表
books = ["存在主义笔记", "道德经", "庄子"]
for book in books:
    print(book)

# 遍历范围
for i in range(5):      # 0, 1, 2, 3, 4
    print(i)

# 带索引
for index, book in enumerate(books):
    print(f"{index}: {book}")

# 遍历字典
for key, value in mentors.items():
    print(f"{key} = {value}")
```

### while 循环

```python
# 循环到条件不满足
count = 0
while count < 5:
    print(count)
    count += 1

# break 跳出
while True:
    user_input = input("输入 q 退出：")
    if user_input == "q":
        break
```

### continue 跳过

```python
# 只打印偶数
for i in range(10):
    if i % 2 != 0:
        continue
    print(i)
```

## 六 · 条件判断

```python
score = 0.85

if score >= 0.8:
    grade = "优秀"
elif score >= 0.6:
    grade = "合格"
else:
    grade = "不合格"

# 多条件
if tradition == "daoism" and author is not None:
    print("道家经典")

if tradition in ("daoism", "yijing"):
    print("中国哲学")

# 三元表达式
status = "已入库" if chunk_count > 0 else "空"
```

## 七 · 函数

### 定义和调用

```python
# 基本函数
def greet(name):
    return f"你好，{name}"

message = greet("老胡")
# "你好，老胡"

# 带默认参数
def search(query, top_k=5):
    return f"搜索 {query}，取 top {top_k}"

search("天干")        # "搜索 天干，取 top 5"
search("地支", 10)    # "搜索 地支，取 top 10"

# 返回多个值
def get_book_info(book_id):
    title = "存在主义笔记"
    author = None
    return title, author   # 返回元组

t, a = get_book_info(1)  # 解包
```

### Lambda 函数

一行代码的小函数：

```python
# 传统
def square(x):
    return x * x

# Lambda（等价）
square = lambda x: x * x

# 常用在排序
books = [{"title": "庄子", "pages": 8}, {"title": "道德经", "pages": 8}, {"title": "列子", "pages": 9}]
books.sort(key=lambda b: b["pages"], reverse=True)
# 按页数降序排
```

## 八 · 文件读写

### 读文件

```python
# 读文本文件
with open("docs/rag-concepts-primer.md", "r", encoding="utf-8") as f:
    content = f.read()

print(content[:100])  # 前 100 字

# 逐行读
with open("docs/exercises.md", "r", encoding="utf-8") as f:
    for line in f:
        print(line.strip())
```

### 写文件

```python
# 覆盖写
with open("output.txt", "w", encoding="utf-8") as f:
    f.write("这是写入的内容")

# 追加写
with open("log.txt", "a", encoding="utf-8") as f:
    f.write("新增一行\n")
```

**注意**：读中文文件一定要加 `encoding="utf-8"`——不加会报编码错误。

### 读 JSON

```python
import json

# 读
with open("data/indexes/chunks.json", "r", encoding="utf-8") as f:
    chunks = json.load(f)

print(len(chunks))  # 266
print(chunks[0]["bookTitle"])  # "存在主义笔记"

# 写
data = {"title": "新书", "tradition": "daoism"}
with open("new_book.json", "w", encoding="utf-8") as f:
    json.dump(data, f, ensure_ascii=False, indent=2)
```

## 九 · 调用 API

智能体开发最常用的操作——调 LLM API 或其他 HTTP 接口。

### 用 requests 库

```python
import requests

# 调 OpenAI 兼容的 Chat API
response = requests.post(
    "https://api.openai.com/v1/chat/completions",
    headers={
        "Authorization": "Bearer sk-...",
        "Content-Type": "application/json"
    },
    json={
        "model": "gpt-4",
        "messages": [
            {"role": "system", "content": "你是老胡，一位盲派算师。"},
            {"role": "user", "content": "天干地支是什么"}
        ],
        "temperature": 0.3
    },
    timeout=30
)

if response.status_code == 200:
    data = response.json()
    answer = data["choices"][0]["message"]["content"]
    print(answer)
else:
    print(f"错误：{response.status_code} {response.text}")
```

### 调 Embedding API

```python
response = requests.post(
    "https://api.openai.com/v1/embeddings",
    headers={
        "Authorization": "Bearer sk-...",
        "Content-Type": "application/json"
    },
    json={
        "model": "text-embedding-3-large",
        "input": "天干地支是八字的基础"
    },
    timeout=10
)

embedding = response.json()["data"][0]["embedding"]
# [0.043, -0.034, 0.044, ...] —— 一串数字（向量）
print(f"向量维度：{len(embedding)}")  # 1536 或 3072
```

## 十 · 异常处理

```python
try:
    response = requests.post(url, json=payload, timeout=30)
    response.raise_for_status()  # 4xx/5xx 会抛异常
    data = response.json()
except requests.Timeout:
    print("请求超时")
except requests.HTTPError as e:
    print(f"HTTP 错误：{e}")
except Exception as e:
    print(f"未知错误：{e}")
else:
    print("成功")
finally:
    print("无论成功失败都执行")
```

## 十一 · 常用标准库

| 库 | 作用 | 常用方法 |
|---|---|---|
| `os` | 文件/目录操作 | `os.listdir()`, `os.path.exists()` |
| `json` | JSON 读写 | `json.load()`, `json.dump()` |
| `re` | 正则表达式 | `re.match()`, `re.findall()` |
| `datetime` | 时间日期 | `datetime.now()`, `datetime.strptime()` |
| `hashlib` | 哈希 | `hashlib.sha256()` |
| `math` | 数学 | `math.sqrt()`, `math.ceil()` |
| `collections` | 数据结构 | `Counter()`, `defaultdict()` |

```python
import os
import hashlib
from collections import Counter

# 列出 docs 目录下所有 .md 文件
md_files = [f for f in os.listdir("docs") if f.endswith(".md")]

# 计算文件 hash
with open("docs/exercises.md", "rb") as f:
    file_hash = hashlib.sha256(f.read()).hexdigest()

# 统计 tradition 分布
traditions = ["yijing", "daoism", "yijing", "existentialism", "yijing"]
counter = Counter(traditions)
# Counter({'yijing': 3, 'daoism': 1, 'existentialism': 1})
print(counter.most_common(2))  # [('yijing', 3), ('daoism', 1)]
```

## 十二 · 实战：用 Python 做文档清洗

把上面学的串起来——一个实际的数据清洗脚本：

```python
import os
import json
import hashlib
from collections import Counter

def clean_markdown(filepath):
    """清洗 Markdown 文件，返回干净的文本块列表。"""
    with open(filepath, "r", encoding="utf-8") as f:
        content = f.read()

    # 去掉 YAML front matter
    if content.startswith("---"):
        end = content.find("---", 3)
        if end != -1:
            content = content[end + 3:]

    # 按标题切分
    chunks = []
    current_title = ""
    current_text = ""

    for line in content.split("\n"):
        if line.startswith("## "):
            # 保存上一个块
            if current_text.strip():
                chunks.append({
                    "section": current_title.strip(),
                    "text": current_text.strip()
                })
            current_title = line.replace("## ", "")
            current_text = ""
        else:
            current_text += line + "\n"

    # 最后一块
    if current_text.strip():
        chunks.append({
            "section": current_title.strip(),
            "text": current_text.strip()
        })

    return chunks

def compute_hash(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()

# 批量处理
all_chunks = []
docs_dir = "docs"

for filename in os.listdir(docs_dir):
    if not filename.endswith(".md"):
        continue

    filepath = os.path.join(docs_dir, filename)
    chunks = clean_markdown(filepath)

    for chunk in chunks:
        chunk["source_file"] = filename
        chunk["hash"] = compute_hash(chunk["text"])
        all_chunks.append(chunk)

# 统计
print(f"共处理 {len(os.listdir(docs_dir))} 个文件")
print(f"共生成 {len(all_chunks)} 个 chunk")

# 按 source_file 统计 chunk 数
file_counts = Counter(c["source_file"] for c in all_chunks)
for filename, count in file_counts.most_common(5):
    print(f"  {filename}: {count} chunks")

# 保存
with open("cleaned_chunks.json", "w", encoding="utf-8") as f:
    json.dump(all_chunks, f, ensure_ascii=False, indent=2)
```

这个脚本用到了：文件读写、字符串操作、列表、字典、循环、函数、`os`/`json`/`hashlib`/`Counter`——就是上面学的全部内容。

## 十三 · Git 版本控制

写代码不版本控制 = 走钢丝不挂保险绳。Git 是程序员的"存档/读档"系统。

### 核心概念

```
工作区（你在改的文件）
  │
  │ git add
  ▼
暂存区（准备提交的文件）
  │
  │ git commit
  ▼
仓库（已提交的历史记录）
  │
  │ git push
  ▼
远程仓库（GitHub / Gitee）
```

### 五个最常用的命令

```bash
# 1. 查看改了什么
git status              # 哪些文件改了
git diff                # 具体改了哪几行

# 2. 保存一个存档
git add .               # 把所有改动放进暂存区
git commit -m "修复了XX问题"
# commit message 要说清楚做了什么，不要写"改了点东西"

# 3. 推送到远程
git push origin main    # 把本地存档推到 GitHub

# 4. 拉取最新代码
git pull origin main    # 把 GitHub 上的最新代码拉到本地

# 5. 回退到之前的版本
git log --oneline       # 查看历史存档
git checkout <commit>   # 回退到某个存档
git revert <commit>    # 撤销某次提交（安全，不改历史）
```

### 天道茶寮的 Git 工作流

```bash
# 第一次：克隆项目
git clone https://github.com/godisego/Way-of-Heaven-Agent.git
cd Way-of-Heaven-Agent

# 日常开发
git pull origin main          # 先拉最新
# ...改代码...
npm run typecheck             # 类型检查
npm test                      # 跑测试
git add .                     # 暂存
git commit -m "feat: 加了XX功能"
git push origin main          # 推送

# 如果改坏了
git checkout -- .             # 放弃所有改动，回到上次 commit
```

### .gitignore

不是所有文件都该提交到 git。敏感配置和临时文件要忽略：

```bash
# .gitignore 文件
.env.local              # 含 API Key，绝对不能提交！
data/                   # 本地数据，不提交
node_modules/           # 依赖包，不提交（用 npm ci 重装）
*.log                   # 日志文件
```

### 常见坑

| 坑 | 后果 | 怎么避免 |
|----|------|---------|
| 提交了 `.env.local` | API Key 泄露到 GitHub | `.gitignore` 加上 `.env.local` |
| 不写 commit message | 不知道改了什么 | `git commit -m "说明改了什么"` |
| 直接 push 到 main | 可能覆盖别人的代码 | 团队协作用分支 + PR |
| 不拉就 push | 冲突 | 先 `git pull` 再 `git push` |

## 十四 · 调试技巧

代码有 bug 是正常的。关键是高效地找到 bug。

### 方法 1：print 大法（最简单）

```python
def search_chunks(query, top_k=5):
    print(f"[DEBUG] query={query}, top_k={top_k}")    # 打印输入
    embedding = embed(query)
    print(f"[DEBUG] embedding dim={len(embedding)}")  # 打印中间结果
    results = vector_search(embedding, top_k)
    print(f"[DEBUG] found {len(results)} results")    # 打印结果
    for r in results:
        print(f"  score={r.score:.3f} src={r.source}")  # 打印详情
    return results
```

**原则**：在"输入→处理→输出"的每一步都打印，看哪一步出问题。

### 方法 2：断点调试

```python
import pdb

def search_chunks(query):
    embedding = embed(query)
    pdb.set_trace()          # 程序会停在这里，进入交互模式
    results = vector_search(embedding)
    return results

# 在 pdb 里可以：
# n → 执行下一行
# s → 进入函数内部
# p variable → 打印变量
# c → 继续执行
# q → 退出
```

### 方法 3：异常日志

```python
import logging

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
logger = logging.getLogger(__name__)

def search_chunks(query):
    logger.info(f"开始搜索: {query}")
    try:
        embedding = embed(query)
        results = vector_search(embedding)
        logger.info(f"搜索完成: 找到 {len(results)} 条结果")
        return results
    except Exception as e:
        logger.error(f"搜索失败: {e}", exc_info=True)  # 打印完整堆栈
        raise
```

### 方法 4：单元测试

```python
# test_search.py
def test_search_returns_results():
    results = search_chunks("天干地支")
    assert len(results) > 0          # 应该有结果
    assert results[0].score > 0       # 分数应该是正的

def test_search_empty_query():
    results = search_chunks("")
    assert len(results) == 0          # 空查询应该返回空

# 运行测试
# pytest test_search.py -v
```

**原则**：每个函数都写测试。改代码后跑一遍测试，确保没改坏。

### 天道茶寮的调试方式

天道茶寮用 TypeScript + vitest，但调试思路一样：

```bash
# 看类型有没有错
npm run typecheck

# 跑测试
npm test

# 看执行轨迹（Agent 模式）
# 对谈界面点「循迹」开关，看每步工具调用

# 看检索结果
curl -X POST http://localhost:3000/api/search \
  -H "Content-Type: application/json" \
  -d '{"query":"天干地支","topK":5}'

# 看健康状态
curl -X POST http://localhost:3000/api/health \
  -H "Content-Type: application/json" -d '{}'
```

→ 想深入：[执行轨迹调试手册](/learn/agent-trace-debugging) 有更详细的 Agent 调试方法。

## 十五 · 自测

1. 列表和字典的区别是什么？各适合什么场景？
2. `with open(...)` 和 `open(...)` 的区别是什么？为什么推荐前者？
3. f-string 是什么？写一个带变量和小数位数的例子。
4. `try/except` 捕获异常的顺序有什么要求？
5. 写一个 Python 函数：接收一段文本，返回它的 SHA-256 hash。
6. Git 的三个区域是什么？`git add` 和 `git commit` 各做什么？
7. 为什么 `.env.local` 不能提交到 git？怎么避免？
8. 四种调试方法分别是什么？哪种最适合"不知道哪里出问题"？

> 边界：这篇是"够用就行"——类、装饰器、生成器、async/await 等高级特性没讲，但入门智能体开发够了。想深入推荐 [Python 官方教程](https://docs.python.org/zh-cn/3/tutorial/)。
