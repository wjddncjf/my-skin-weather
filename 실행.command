#!/bin/zsh
set -eu
cd -- "${0:A:h}"
url='http://127.0.0.1:8000/'
if /usr/bin/curl -fsS --max-time 2 "${url}app.js" | /usr/bin/cmp -s - dist/app.js; then
  /usr/bin/open "$url"
  exit
fi
if /usr/sbin/lsof -nP -iTCP:8000 -sTCP:LISTEN >/dev/null; then
  print '8000 포트를 다른 서비스가 사용 중입니다. 해당 서버를 종료한 뒤 다시 실행해 주세요.'
  read -r '?Enter를 누르면 종료합니다. '
  exit 1
fi
if ! command -v python3 >/dev/null; then
  print '실행하려면 Python 3이 필요합니다.'
  read -r '?Enter를 누르면 종료합니다. '
  exit 1
fi
python3 -m http.server 8000 --bind 127.0.0.1 --directory dist &
server_pid=$!
trap 'kill "$server_pid" 2>/dev/null || true' EXIT
for attempt in {1..20}; do
  if /usr/bin/curl -fsS --max-time 1 "$url" >/dev/null 2>&1; then
    /usr/bin/open "$url"
    print '이 터미널을 열어 두면 미리보기가 계속 실행됩니다. 종료하려면 Control-C를 누르세요.'
    wait "$server_pid"
    exit
  fi
  sleep 0.2
done
print '로컬 서버가 시작되지 않았습니다.'
exit 1
