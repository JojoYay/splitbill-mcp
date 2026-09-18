/**
 * 中継がちゃんと通るかを見るだけの確かめ (npm run smoke)。
 *
 *   SPLITBILL_TOKEN=wkn_… [SPLITBILL_URL=…] npm run smoke
 *
 * initialize → tools/list を標準入力から流し込み、返ってきた行を出す。
 * **本番の割り勘は作らない** (読むだけの2つしか投げない)。
 */
import { spawn } from 'node:child_process';

const child = spawn(process.execPath, ['index.js'], {
    stdio: ['pipe', 'pipe', 'inherit'],
    env: process.env,
});

let got = '';
child.stdout.setEncoding('utf8');
child.stdout.on('data', (d) => { got += d; });

const send = (o) => child.stdin.write(`${JSON.stringify(o)}\n`);
send({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-06-18' } });
send({ jsonrpc: '2.0', method: 'notifications/initialized' });
send({ jsonrpc: '2.0', id: 2, method: 'tools/list' });

setTimeout(() => {
    child.stdin.end();
    const lines = got.split('\n').filter(Boolean).map((l) => {
        try { return JSON.parse(l); } catch { return { raw: l }; }
    });
    const init = lines.find((l) => l.id === 1);
    const tools = lines.find((l) => l.id === 2);
    const names = (tools?.result?.tools ?? []).map((t) => t.name);

    console.log('server :', init?.result?.serverInfo?.title ?? init?.error?.message ?? '(応答なし)');
    console.log('tools  :', names.join(', ') || '(なし)');
    const ok = !!init?.result && names.length > 0;
    console.log(ok ? 'OK' : 'NG');
    process.exit(ok ? 0 : 1);
}, 6000);
