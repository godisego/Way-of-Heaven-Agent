---
name: sql-basics
description: SQL 基础——SELECT/WHERE/ORDER BY/GROUP BY/JOIN，给从没写过 SQL 的人
---

# SQL 基础（附录）

这篇是给从没写过 SQL 的人的——半小时读完，能看懂和写基本的数据库查询。

> 为什么智能体开发者要学 SQL？因为很多企业智能体的数据存在数据库里，你需要写 SQL 取数据给模型用。

## 一 · SQL 是什么

SQL（Structured Query Language）= 和数据库对话的语言。

数据库（如 PostgreSQL、MySQL）把数据存在**表**里——你可以理解为一个 Excel 表格：

```
表名：books

| id | title          | author    | tradition       |
|----|----------------|-----------|-----------------|
| 1  | 存在主义笔记    | null      | existentialism  |
| 2  | 道德经处世选读  | 老子      | daoism           |
| 3  | 周易六十四卦    | 公版整理  | yijing           |
```

SQL 就是用来"问这张表"的语言。

## 二 · SELECT——查什么

最基本的查询：从表里取数据。

```sql
-- 查所有列
SELECT * FROM books;

-- 查特定列
SELECT title, author FROM books;
```

结果：
```
| title          | author    |
|----------------|-----------|
| 存在主义笔记    | null      |
| 道德经处世选读  | 老子      |
| 周易六十四卦    | 公版整理  |
```

### 限制行数

```sql
-- 只取前 5 行（调试时很有用）
SELECT * FROM books LIMIT 5;
```

### 去重

```sql
-- 所有不同的 tradition（去重）
SELECT DISTINCT tradition FROM books;
```

结果：
```
| tradition       |
|-----------------|
| existentialism  |
| daoism           |
| yijing           |
```

## 三 · WHERE——过滤

`WHERE` = 按条件筛选行。

```sql
-- 只查 daoism 类的书
SELECT title FROM books WHERE tradition = 'daoism';
```

### 比较运算

| 运算 | 含义 | 例子 |
|------|------|------|
| `=` | 等于 | `WHERE tradition = 'daoism'` |
| `!=` 或 `<>` | 不等于 | `WHERE author != '老子'` |
| `>` / `<` | 大于 / 小于 | `WHERE id > 2` |
| `>=` / `<=` | 大于等于 / 小于等于 | `WHERE id >= 2` |
| `IS NULL` | 是空值 | `WHERE author IS NULL` |
| `IS NOT NULL` | 不是空值 | `WHERE author IS NOT NULL` |

### 多条件

```sql
-- daoism 或 yijing 的书
SELECT title FROM books
WHERE tradition = 'daoism' OR tradition = 'yijing';

-- 等价写法（IN 更简洁）
SELECT title FROM books
WHERE tradition IN ('daoism', 'yijing');

-- 同时满足两个条件
SELECT title FROM books
WHERE tradition = 'daoism' AND author IS NOT NULL;
```

### 模糊匹配

```sql
-- 标题包含"处世"的书
SELECT title FROM books
WHERE title LIKE '%处世%';
```

`%` 代表任意字符——`%处世%` = 前后可以有任意字符，中间必须有"处世"。

## 四 · ORDER BY——排序

```sql
-- 按 id 升序（从小到大，默认）
SELECT * FROM books ORDER BY id ASC;

-- 按 id 降序（从大到小）
SELECT * FROM books ORDER BY id DESC;

-- 多列排序：先按 tradition 排，再按 title 排
SELECT * FROM books ORDER BY tradition ASC, title ASC;
```

## 五 · GROUP BY——分组统计

`GROUP BY` = 把数据按某列分组，然后对每组做统计。

```sql
-- 每个 tradition 有多少本书
SELECT tradition, COUNT(*) AS book_count
FROM books
GROUP BY tradition;
```

结果：
```
| tradition       | book_count |
|-----------------|------------|
| existentialism  | 2          |
| daoism           | 3          |
| yijing           | 5          |
```

### 聚合函数

| 函数 | 作用 |
|------|------|
| `COUNT(*)` | 数行数 |
| `SUM(column)` | 求和 |
| `AVG(column)` | 平均值 |
| `MAX(column)` | 最大值 |
| `MIN(column)` | 最小值 |

```sql
-- 每个 tradition 的平均 id
SELECT tradition, AVG(id) AS avg_id
FROM books
GROUP BY tradition;
```

### HAVING——分组后过滤

`WHERE` 是分组前过滤；`HAVING` 是分组后过滤：

```sql
-- 有 2 本以上书的 tradition
SELECT tradition, COUNT(*) AS book_count
FROM books
GROUP BY tradition
HAVING COUNT(*) > 2;
```

## 六 · JOIN——连表

`JOIN` = 把两张表按某列拼起来。

假设我们还有一张 `chunks` 表（文档的切片）：

```
表名：chunks

| chunk_id | document_id | section_title  | text                |
|----------|-------------|----------------|---------------------|
| chk_001  | 1           | 自由与选择      | 自由意味着选择...    |
| chk_002  | 1           | 自欺           | 自欺是否定...        |
| chk_003  | 2           | 第四十八章      | 为学日益...         |
```

`document_id` 指向 `books.id`——这就是两张表的关联。

### INNER JOIN

最常用的 JOIN——只返回两张表都有匹配的行：

```sql
-- 每本书的每个 chunk
SELECT books.title, chunks.section_title, chunks.text
FROM books
INNER JOIN chunks ON books.id = chunks.document_id;
```

结果：
```
| title          | section_title | text              |
|----------------|---------------|-------------------|
| 存在主义笔记    | 自由与选择     | 自由意味着选择...  |
| 存在主义笔记    | 自欺          | 自欺是否定...      |
| 道德经处世选读  | 第四十八章    | 为学日益...        |
```

### LEFT JOIN

左表的行全部保留，右表没匹配的用 NULL 填：

```sql
-- 所有书，包括没有 chunk 的
SELECT books.title, chunks.chunk_id
FROM books
LEFT JOIN chunks ON books.id = chunks.document_id;
```

如果某本书没有 chunk，`chunk_id` 就是 NULL。

### 多表 JOIN

```sql
-- 三张表连起来
SELECT
  books.title,
  chunks.section_title,
  chunks.text
FROM books
INNER JOIN chunks ON books.id = chunks.document_id
INNER JOIN embeddings ON chunks.chunk_id = embeddings.chunk_id
WHERE books.tradition = 'daoism';
```

## 七 · 实用技巧

### 别名（AS）

```sql
SELECT b.title AS 书名, c.section_title AS 章节
FROM books AS b
JOIN chunks AS c ON b.id = c.document_id;
```

### 子查询

```sql
-- chunk 数最多的书
SELECT title FROM books
WHERE id = (
  SELECT document_id
  FROM chunks
  GROUP BY document_id
  ORDER BY COUNT(*) DESC
  LIMIT 1
);
```

### CASE 表达式

```sql
-- 给 tradition 起中文名
SELECT
  title,
  CASE tradition
    WHEN 'daoism' THEN '道家'
    WHEN 'yijing' THEN '易传'
    WHEN 'existentialism' THEN '存在主义'
    ELSE '其他'
  END AS 分类
FROM books;
```

### INSERT / UPDATE / DELETE

```sql
-- 插入数据
INSERT INTO books (title, author, tradition)
VALUES ('庄子内篇行动札记', '知识库整理', 'daoism');

-- 更新数据
UPDATE books SET author = '佚名' WHERE author IS NULL;

-- 删除数据
DELETE FROM books WHERE id = 999;
```

## 八 · 天道茶寮在哪用到 SQL

天道茶寮默认用 Local JSON（不需要 SQL），但切换到 Supabase 后端时需要：

| 操作 | SQL | 对应代码 |
|------|-----|---------|
| 查所有文档 | `SELECT * FROM documents` | `documentRepository.ts` |
| 查某个文档的 chunks | `SELECT * FROM chunks WHERE document_id = ?` | `documentRepository.ts` |
| 向量搜索 | `SELECT * FROM match_chunks(...)` | `vectorStore.ts`（Supabase） |
| 插入文档 | `INSERT INTO documents ...` | `documentRepository.ts` |

## 九 · 数据治理：质量、脱敏、权限

AI 应用用的数据如果脏、泄露、被越权访问——产品就完了。这三件事必须在数据库层就管好。

### 数据质量

垃圾进、垃圾出。数据质量直接影响 AI 回答质量。

```sql
-- 检查空值（AI 最怕拿到空数据）
SELECT COUNT(*) FROM books WHERE author IS NULL;
-- 结果：1 → 有 1 本书没填 author

-- 检查重复
SELECT title, COUNT(*) as cnt
FROM books
GROUP BY title
HAVING COUNT(*) > 1;
-- 结果：如果有重复 → 需要去重

-- 检查异常值
SELECT * FROM chunks WHERE LENGTH(text) < 10;
-- 结果：如果有 → 太短的 chunk 可能没有信息量

-- 检查孤立数据（chunk 指向不存在的文档）
SELECT c.* FROM chunks c
LEFT JOIN documents d ON c.document_id = d.id
WHERE d.id IS NULL;
-- 结果：如果有 → 数据完整性被破坏
```

### 数据脱敏

用户的敏感信息（PII）在存进数据库前要脱敏：

```sql
-- 假设有个用户表，含手机号
-- 存的时候就脱敏（只存后4位）
INSERT INTO users (name, phone_masked)
VALUES ('张三', '****1234');

-- 查询时也不暴露完整手机号
SELECT name, phone_masked FROM users;
-- 结果：张三 | ****1234

-- 如果必须存完整手机号（如发短信），用单独的加密表
-- 主表只存引用
SELECT name, phone_masked FROM users;           -- 所有人能查
SELECT phone_full FROM user_pii WHERE user_id=1; -- 只有有权限的人能查
```

### 权限控制

```sql
-- 创建只读用户（给 AI 查询用）
CREATE ROLE ai_reader WITH PASSWORD 'xxx';
GRANT SELECT ON books, chunks TO ai_reader;
-- ai_reader 不能 INSERT / UPDATE / DELETE

-- 创建写用户（给入库脚本用）
CREATE ROLE ai_writer WITH PASSWORD 'yyy';
GRANT SELECT, INSERT, UPDATE ON books, chunks TO ai_writer;
-- ai_writer 不能 DELETE（防止误删）

-- 管理员才有完整权限
CREATE ROLE ai_admin WITH PASSWORD 'zzz' SUPERUSER;
```

**原则**：AI 应用用最小权限。查询用只读账号，入库用写账号，不要用 admin。

→ 想深入：[AI 安全与治理](/learn/ai-security-governance) 有完整的数据分级和治理体系。

## 十 · 自测

1. `SELECT *` 和 `SELECT title, author` 有什么区别？
2. `WHERE` 和 `HAVING` 的区别是什么？
3. `INNER JOIN` 和 `LEFT JOIN` 的区别是什么？
4. 写一个 SQL：查 daoism 类的、有 author 的、按 title 排序的书。
5. 写一个 SQL：统计每个 tradition 有多少个 chunk。
6. 数据质量检查要查哪四种异常？
7. 为什么 AI 应用要用只读数据库账号？

> 边界：这篇是"够用就行"——SQL 的窗口函数、CTE、索引优化等高级特性没讲，但入门智能体开发够了。想深入推荐 [SQLZoo](https://sqlzoo.net/) 交互练习。
