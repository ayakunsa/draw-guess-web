# 词库来源与授权

本目录的 JSON 从上游 ai-draw-guess/data/ 复制而来，按上游约定保留各自授权条款，不统一声明为 MIT：

- idioms.json（成语：入门 218 / 进阶 2000 / 挑战 29508）：来源 pwxcoo/chinese-xinhua（MIT）与 THUOCL（仅取词频排序）；上游 idioms-sources.json 记录 sourceRows 30895 与 6 条人工补充。
- category-words.json（动物/食物/物品/职业/动作/故事 × 三档）：来源见上游仓库说明，保留原条款。

规则与判定逻辑改写自上游 lib/words.mjs 与 lib/game.mjs，代码沿用项目 MIT；词库数据不在此列。