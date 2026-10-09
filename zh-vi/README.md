# Cùng học tiếng Trung

Independent Chinese–Vietnamese edition. The original Japanese app in the parent directory is unchanged.

Open `index.html` for card practice, or serve this directory over HTTPS for microphone access (localhost also works for development). GitHub Pages URL: `https://ccc373671231.github.io/jp-cards/zh-vi/`.

- Chinese sentence, Vietnamese translation, optional pinyin, pattern and topic groups.
- Add/edit, labeled bulk import, JSON backup/import, deletion with undo, word mastery, group collapse and ordering (arrow buttons also work on mobile).
- Device-provided Mandarin speech voices and adjustable speed. Voice availability/quality depends on browser and operating system. No cloud API keys required.
- Microphone recording and playback, four recordings per card. No automatic pronunciation scoring. Recordings use the separate `zhViRecordings` IndexedDB; card data uses `zhViCards.v1` localStorage.

## Bulk input

Separate cards with a blank line. Vocabulary entries are separated with semicolons.

```text
中文: 我不是不想回你消息，而是刚才在工作。
越南语: Không phải tôi không muốn trả lời tin nhắn của bạn, mà là lúc nãy tôi đang làm việc.
拼音: Wǒ bú shì bù xiǎng huí nǐ xiāoxi, érshì gāngcái zài gōngzuò.
句型: 不是……而是……
场景: Trò chuyện trực tuyến
单词: 工作/gōngzuò/làm việc;消息/xiāoxi/tin nhắn
```

JSON import accepts this app's exported backup or an array of cards with `zh`, `vi`, optional `pinyin`, `pattern`, `scenes` (string array), and `vocab` (objects with `zh`, `pinyin`, `vi`). Japanese-app backups are rejected. Import merges IDs; same-ID cards are replaced. JSON backups exclude audio recordings.

## Verification

Run `node zh-vi/test.cjs` from the repository root. Before classroom rollout, test actual Mandarin audio, microphone permission, recording/playback, refresh persistence and JSON sharing on the students' phones.

Cards and recordings are local to each browser/device. Clearing site data removes them. Teacher-added cards are not automatically sent to students: distribute a JSON file or update the built-in curriculum and publish it. Use the same HTTPS URL consistently; file URLs and different origins have separate data.
