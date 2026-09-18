#!/usr/bin/env node
/**
 * splitbill-mcp — SplitBill の MCP サーバー (stdio ⇄ リモートの中継)
 *
 * SplitBill 本体はリモートのMCP (Streamable HTTP) として動いている。
 * こちらは**その前に立つだけ**の薄い中継で、MCPクライアントが標準入出力で
 * 話してきたものをそのままリモートへ投げ、返ってきたものを書き戻す。
 *
 * なぜ必要か: リモートに直接繋ぐ形だと「あなたの鍵 (トークン)」をURLに
 * 載せるしかなく、配布 (レジストリ掲載) に向かない。stdio のパッケージなら
 * **鍵は各自が環境変数で持つ**ので、同じ1行の設定を誰でも使える。
 *
 * 設定:
 *   SPLITBILL_TOKEN  … https://sposched.jittee.com/split/mcp/ で作る鍵 (wkn_…)
 *   SPLITBILL_URL    … 繋ぎ先 (既定: 本番)。テスト環境を見るときだけ変える
 *
 * ⚠ お金はこの仕組みを通らない。作れるのは「割り勘のページ」だけ。
 */

const DEFAULT_URL = 'https://yyeleqhfbbjnscaddutx.supabase.co/functions/v1/warikan-mcp';

const endpoint = (process.env.SPLITBILL_URL || DEFAULT_URL).trim();
const token = (process.env.SPLITBILL_TOKEN || '').trim();
/** URLに ?token= が入っているなら、それで足りる (ヘッダーは付けない) */
const tokenInUrl = /[?&]token=/.test(endpoint);

if (!token && !tokenInUrl) {
    process.stderr.write(
        'splitbill-mcp: SPLITBILL_TOKEN がありません。\n'
        + 'https://sposched.jittee.com/split/mcp/ で接続を作り、wkn_ で始まる鍵を\n'
        + 'SPLITBILL_TOKEN に入れてください。\n',
    );
    process.exit(1);
}

const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
};

const out = (obj) => process.stdout.write(`${JSON.stringify(obj)}\n`);

/**
 * 終わり方の面倒 (0277)。標準入力が閉じても、**投げたものが返るまでは終わらない**。
 * 先に終わると、最後の1件の応答を落としたまま消えることになる。
 */
let pending = 0;
let stdinEnded = false;
const maybeExit = () => {
    // ⚠ ここで process.exit() を呼んではいけない。**標準出力がパイプのとき、
    //    書き込み途中のものを道連れにして消える** (Nodeの落とし穴)。実際、
    //    最後に返ってきた応答が1件まるごと失われていた。
    //    何も残っていなければイベントループが空になって自然に終わる。
    if (stdinEnded && pending === 0) process.exitCode = 0;
};

/** 1件を投げて、返ってきたら書き戻す。通知 (idなし) は書き戻さない */
async function forward(msg) {
    const isNotification = msg == null || msg.id === undefined || msg.id === null;
    pending += 1;
    try {
        const res = await fetch(endpoint, {
            method: 'POST',
            headers,
            body: JSON.stringify(msg),
        });
        // 202 / 204 は「応答なし」= 通知を受け取っただけ
        if (res.status === 202 || res.status === 204) return;
        const text = await res.text();
        if (!text) return;
        if (isNotification) return;

        // SSE で返ってくるクライアント互換の形にも備える
        if ((res.headers.get('content-type') ?? '').includes('text/event-stream')) {
            for (const line of text.split('\n')) {
                const t = line.trim();
                if (t.startsWith('data:')) {
                    const body = t.slice(5).trim();
                    if (body) process.stdout.write(`${body}\n`);
                }
            }
            return;
        }
        process.stdout.write(`${text.trim()}\n`);
    } catch (e) {
        if (isNotification) return;
        out({
            jsonrpc: '2.0',
            id: msg.id,
            error: { code: -32001, message: `splitbill-mcp: ${e?.message ?? String(e)}` },
        });
    } finally {
        pending -= 1;
        maybeExit();
    }
}

// 標準入力は**1行1メッセージ** (MCPのstdioの決まり)
let buf = '';
process.stdin.setEncoding('utf8');
process.stdin.on('data', (chunk) => {
    buf += chunk;
    let at;
    while ((at = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, at).trim();
        buf = buf.slice(at + 1);
        if (!line) continue;
        let msg;
        try {
            msg = JSON.parse(line);
        } catch {
            out({ jsonrpc: '2.0', id: null, error: { code: -32700, message: 'parse error' } });
            continue;
        }
        void forward(msg);
    }
});
process.stdin.on('end', () => { stdinEnded = true; maybeExit(); });
