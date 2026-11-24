// Blokuje groźne komendy gita (hook PreToolUse dla Bash): push, kasowanie zmian i historii, omijanie bramki przed commitem.
'use strict';

function commands(src) {
  const out = [];
  let i = 0;
  function scan(stop) {
    let cmd = [],
      word = '',
      has = false,
      docs = [];
    const endWord = () => {
      if (has) cmd.push(word);
      word = '';
      has = false;
    };
    const endCmd = () => {
      endWord();
      if (cmd.length) out.push(cmd);
      cmd = [];
    };
    const sub = close => {
      scan(close);
      word += '…';
      has = true;
    };
    while (i < src.length) {
      const c = src[i];
      if (stop && c === stop) {
        i++;
        break;
      }
      if (c === '\\') {
        if (src[i + 1] !== '\n') {
          word += src[i + 1] || '';
          has = true;
        }
        i += 2;
      } else if (c === "'") {
        const e = src.indexOf("'", i + 1);
        word += src.slice(i + 1, e < 0 ? src.length : e);
        has = true;
        i = e < 0 ? src.length : e + 1;
      } else if (c === '"') {
        has = true;
        i++;
        while (i < src.length && src[i] !== '"') {
          if (src[i] === '\\') {
            word += src[i + 1] || '';
            i += 2;
          } else if (src[i] === '$' && src[i + 1] === '(') {
            i += 2;
            sub(')');
          } else if (src[i] === '`') {
            i++;
            sub('`');
          } else word += src[i++];
        }
        i++;
      } else if (c === '$' && src[i + 1] === '(') {
        i += 2;
        sub(')');
      } else if (c === '`') {
        i++;
        sub('`');
      } else if (c === '(') {
        endCmd();
        i++;
        scan(')');
      } else if (c === '#' && !has) {
        while (i < src.length && src[i] !== '\n') i++;
      } else if (c === '<' && src[i + 1] === '<' && src[i + 2] !== '<') {
        endWord();
        i += src[i + 2] === '-' ? 3 : 2;
        while (src[i] === ' ' || src[i] === '\t') i++;
        let d = '';
        while (i < src.length && !/[\s;&|()<>]/.test(src[i])) {
          if (!`'"\\`.includes(src[i])) d += src[i];
          i++;
        }
        docs.push(d);
      } else if (c === '\n') {
        endCmd();
        i++;
        for (const d of docs)
          while (i < src.length) {
            let e = src.indexOf('\n', i);
            if (e < 0) e = src.length;
            const line = src.slice(i, e).replace(/^\t+/, '');
            i = e + 1;
            if (line === d) break;
          }
        docs = [];
      } else if (c === ' ' || c === '\t') {
        endWord();
        i++;
      } else if (';&|)'.includes(c)) {
        endCmd();
        i++;
      } else {
        word += c;
        has = true;
        i++;
      }
    }
    endCmd();
  }
  scan('');
  return out;
}

const WRAPPERS = new Set(['sudo', 'env', 'command', 'builtin', 'exec', 'nohup', 'time', 'nice', 'timeout', 'stdbuf']);
for (const w of ['xargs', 'then', 'do', 'else', 'elif', 'if', 'while', 'until', '{', '!']) WRAPPERS.add(w);
const SHELLS = new Set(['sh', 'bash', 'zsh', 'dash']);
const flag = (a, ...names) => a.some(x => names.includes(x));
const short = (a, letter) => a.some(x => /^-[A-Za-z]+$/.test(x) && x.includes(letter));

function skipsGate(a) {
  for (let k = 0; k < a.length; k++) {
    const x = a[k];
    if (x === '--') break;
    if (x === '--no-verify') return true;
    if (/^--(message|file|author|date|template|reuse-message|reedit-message|fixup|squash|trailer|cleanup)$/.test(x)) k++;
    else if (/^-[A-Za-z]/.test(x))
      for (let j = 1; j < x.length; j++) {
        if (x[j] === 'n') return true;
        if ('mFcCtSu'.includes(x[j])) {
          if (j === x.length - 1 && 'mFcCt'.includes(x[j])) k++;
          break;
        }
      }
  }
  return false;
}

function gitReason(argv) {
  const cfg = [];
  let k = 0;
  for (; k < argv.length; k++) {
    const x = argv[k];
    if (x === '-c') cfg.push(argv[++k] || '');
    else if (x.startsWith('--config-env=')) cfg.push(x.slice(13));
    else if (['-C', '--git-dir', '--work-tree', '--namespace', '--config-env'].includes(x)) k++;
    else if (!x.startsWith('-')) break;
  }
  const sub = argv[k],
    a = argv.slice(k + 1);
  if (cfg.some(c => /^core\.hookspath/i.test(c))) return 'zmiana core.hooksPath w komendzie omija bramkę przed commitem';
  switch (sub) {
    case 'push':
      return 'wysyłkę na serwer (git push) robi użytkownik';
    case 'reset':
      return flag(a, '--hard') ? 'git reset --hard kasuje niezapisane zmiany' : '';
    case 'clean':
      return (flag(a, '--force') || short(a, 'f')) && !(flag(a, '--dry-run') || short(a, 'n'))
        ? 'git clean -f kasuje pliki spoza gita'
        : '';
    case 'checkout':
      return (a.includes('--') && a.indexOf('--') < a.length - 1) || flag(a, '.', '-f', '--force')
        ? 'git checkout z plikami albo z -f kasuje niezapisane zmiany'
        : '';
    case 'restore':
      return (flag(a, '--staged') || short(a, 'S')) && !(flag(a, '--worktree') || short(a, 'W'))
        ? ''
        : 'git restore kasuje niezapisane zmiany w plikach';
    case 'switch':
      return flag(a, '-f', '--force', '--discard-changes', '-C', '--force-create')
        ? 'git switch z wymuszeniem kasuje zmiany albo nadpisuje gałąź'
        : '';
    case 'branch':
      return short(a, 'D') || flag(a, '-f', '--force', '-M')
        ? 'wymuszone usuwanie albo nadpisywanie gałęzi gubi commity'
        : '';
    case 'stash':
      return ['drop', 'clear'].includes(a[0]) ? 'git stash drop/clear kasuje odłożone zmiany' : '';
    case 'commit':
      return skipsGate(a) ? 'commit z pominięciem bramki (--no-verify) może zrobić tylko użytkownik' : '';
    case 'rebase':
      return flag(a, '--abort', '--quit', '--continue', '--skip', '--show-current-patch', '--edit-todo')
        ? ''
        : 'git rebase przepisuje historię';
    case 'filter-branch':
    case 'filter-repo':
      return 'przepisywanie historii';
    case 'reflog':
      return ['expire', 'delete'].includes(a[0]) ? 'kasowanie reflogu usuwa możliwość odzyskania commitów' : '';
    case 'update-ref':
      return flag(a, '-d') ? 'usuwanie referencji gubi commity' : '';
    case 'gc':
      return a.some(x => /^--prune=(now|all)/.test(x)) ? 'natychmiastowe czyszczenie usuwa zgubione commity' : '';
    case 'config': {
      const i = a.findIndex(x => /^core\.hookspath$/i.test(x));
      const unset = a.some(x => /^(--)?(unset|unset-all)$/.test(x));
      if ((flag(a, '--remove-section', 'remove-section') && a.includes('core')) || (i >= 0 && unset))
        return 'wyłączenie bramki przed commitem';
      return i >= 0 && a[i + 1] !== undefined && a[i + 1] !== '.githooks' ? 'wyłączenie bramki przed commitem' : '';
    }
  }
  return '';
}

function check(src, depth = 0) {
  if (depth > 3) return '';
  for (const argv of commands(src)) {
    let k = 0;
    while (k < argv.length) {
      if (/^[A-Za-z_]\w*=/.test(argv[k])) k++;
      else if (WRAPPERS.has(argv[k])) {
        k++;
        while (k < argv.length && /^(-.*|\d+(\.\d+)?[smhd]?)$/.test(argv[k])) k++;
      } else break;
    }
    const exe = (argv[k] || '').split('/').pop(),
      rest = argv.slice(k + 1);
    let r = '';
    if (SHELLS.has(exe)) {
      const c = rest.findIndex(x => /^-[a-z]*c[a-z]*$/.test(x));
      if (c >= 0 && rest[c + 1] !== undefined) r = check(rest[c + 1], depth + 1);
    } else if (exe === 'eval') r = check(rest.join(' '), depth + 1);
    else if (exe === 'git') r = gitReason(rest);
    if (r) return r;
  }
  return '';
}

let input = '';
process.stdin.on('data', d => (input += d));
process.stdin.on('end', () => {
  let cmd = '';
  try {
    cmd = String(JSON.parse(input).tool_input.command || '');
  } catch (e) {
    process.exit(0);
  }
  const reason = check(cmd);
  if (reason)
    process.stdout.write(
      JSON.stringify({
        hookSpecificOutput: {
          hookEventName: 'PreToolUse',
          permissionDecision: 'deny',
          permissionDecisionReason: `Zablokowane przez .claude/hooks/blokada-gita.js: ${reason}. Nie obchodź blokady innym sposobem. Jeśli ta komenda jest potrzebna, wyjaśnij użytkownikowi po co i poproś o samodzielne wykonanie.`,
        },
      }) + '\n'
    );
  process.exit(0);
});
