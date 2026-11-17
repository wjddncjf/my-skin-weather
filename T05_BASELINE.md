# 과제 5 — AI 작업 전 검사 결과

## 검사 실행 정보
- 실행 시각: 2026-11-17 14:15:20 KST
- 시작 소스 커밋: ccd2be167da2fb8eb51efb66639c309f99d7a7eb
- 실행 명령: node --test scripts/t05-fixed.test.mjs

## 검사 결과
- 전체 검사: 10
- PASS: 0
- FAIL: 10
- 실패한 검사: T05-01 ~ T05-10

## 실패 원인
- nextCheck.date 및 nextCheck.message 미구현
- T05-10은 기존 사용 보류 판정은 유지됨
- AI A와 B의 작업 전 기준선으로 사용
- 이 실행은 AI A/B의 오류 회차에 포함하지 않음

## 고정 조건
- AI별 시간 상한: 45분
- AI별 사용자 요청 상한: 12회
- 검사 삭제 및 기대값 변경 금지
