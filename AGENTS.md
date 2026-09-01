<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## 🚨 MANDATORY AGENT RULE (작업 전 필수 확인 사항)
* 모든 개발 및 수정 작업 전 반드시 [TROUBLESHOOTING.md](file:///Users/park/review-moa/TROUBLESHOOTING.md) 문서를 정독하고 기재된 원인과 재발 방지 가이드라인을 확인해야 합니다.
* 임시 하드코딩 캡(`slice(0, 5)` 등)이나 무조건적 더미 fallback 수치(`val = 10` 등)를 작성하여 기존 데이터의 수치를 왜곡하거나 누락시키지 않도록 원천 차단하십시오.
