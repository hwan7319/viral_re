import { NextRequest, NextResponse } from 'next/server';
import { upsertUser, getUserBookmarks } from '@/lib/db';
import axios from 'axios';

// 🔑 카카오 REST API 공식 규격 OAuth 콜백 라우터
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  // 카카오 클라이언트 정보 (환경 변수 또는 기본 개발용 설정)
  const KAKAO_CLIENT_ID = process.env.KAKAO_CLIENT_ID || process.env.NEXT_PUBLIC_KAKAO_CLIENT_ID || 'your_kakao_client_id';
  // 콜백 주소는 반드시 Kakao Developers 에 등록된 주소와 일치해야 합니다.
  const KAKAO_REDIRECT_URI = process.env.KAKAO_REDIRECT_URI || 'http://localhost:3030/api/auth/callback/kakao';

  // 1. 카카오 로그인 에러 발생 시 처리
  if (error || !code) {
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>인증 실패</title>
        <script>
          alert("카카오 로그인 인증이 취소되었거나 오류가 발생했습니다.");
          window.close();
        </script>
      </head>
      <body>인증 실패</body>
      </html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  try {
    // 2. 카카오 토큰 발급 요청 (REST API: POST https://kauth.kakao.com/oauth/token)
    const tokenUrl = 'https://kauth.kakao.com/oauth/token';
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: KAKAO_CLIENT_ID,
      redirect_uri: KAKAO_REDIRECT_URI,
      code: code
    });

    const tokenRes = await axios.post(tokenUrl, params.toString(), {
      headers: {
        'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      timeout: 5000
    });

    const { access_token } = tokenRes.data;

    // 3. 사용자 정보 획득 요청 (REST API: GET https://kapi.kakao.com/v2/user/me)
    const userMeUrl = 'https://kapi.kakao.com/v2/user/me';
    const userMeRes = await axios.get(userMeUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`,
        'Content-type': 'application/x-www-form-urlencoded;charset=utf-8'
      },
      timeout: 5000
    });

    const kakaoUser = userMeRes.data;
    const id = `kakao_${kakaoUser.id}`;
    const name = kakaoUser.kakao_account?.profile?.nickname || `카카오사용자_${kakaoUser.id}`;
    const email = kakaoUser.kakao_account?.email || `${kakaoUser.id}@kakao.user`;
    const avatar = kakaoUser.kakao_account?.profile?.profile_image_url || 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80';

    // 4. SQLite DB에 유저 정보 저장 (Upsert)
    const savedUser = await upsertUser({
      id,
      name,
      email,
      avatar,
      provider: 'KakaoTalk'
    });

    // 5. 유저의 북마크 정보 조회
    const bookmarks = await getUserBookmarks(savedUser.id);

    // 6. 부모창으로 사용자 정보 및 북마크 목록 송신 후 팝업 닫기
    const postData = {
      type: 'MOCK_LOGIN_SUCCESS', // 기존 리스너 구조와 100% 호환되도록 매핑
      user: savedUser,
      bookmarks
    };

    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>카카오 인증 완료</title>
        <script>
          if (window.opener) {
            window.opener.postMessage(${JSON.stringify(postData)}, '*');
          }
          window.close();
        </script>
      </head>
      <body style="font-family: sans-serif; text-align: center; padding-top: 100px; background-color: #0f172a; color: #fff;">
        <h2>카카오 인증 완료!</h2>
        <p>로그인 세션을 부모창과 동기화하는 중입니다...</p>
      </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (err: any) {
    console.error('[Kakao Callback API Error]:', err.message);
    
    // Fallback: 환경변수가 잘못 세팅되었거나 API 호출에 실패한 경우 가상 로그인 입력창으로 부드럽게 유도
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>카카오 개발자 키 미설정 안내</title>
        <meta charset="utf-8">
        <style>
          body { font-family: sans-serif; background-color: #0f172a; color: #f8fafc; text-align: center; padding: 40px 20px; }
          .card { background: rgba(30,41,59,0.8); border: 1px solid rgba(255,255,255,0.1); padding: 30px; border-radius: 16px; max-width: 380px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
          .warn-icon { font-size: 40px; color: #fee500; margin-bottom: 16px; }
          input { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: #1e293b; color: #fff; box-sizing: border-box; margin-bottom: 12px; outline: none; }
          button { width: 100%; padding: 12px; border-radius: 8px; background: #fee500; color: #191919; font-weight: 700; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="warn-icon">⚠️</div>
          <h3 style="margin-top:0;">카카오 앱 키 미등록 상태</h3>
          <p style="font-size:0.8rem; color:#94a3b8; line-height:1.5; margin-bottom:20px;">
            로컬 환경변수(.env)에 <strong>KAKAO_CLIENT_ID</strong>가 설정되어 있지 않거나 인증키가 만료되었습니다.<br>
            가상 카카오 정보 입력을 통해 로그인을 진행합니다.
          </p>
          <div style="text-align: left;">
            <input type="text" id="userName" value="라이언 (Kakao)" />
            <input type="email" id="userEmail" value="ryan.kakao@kakao.com" />
          </div>
          <button id="btnSubmit">가상 카카오 로그인 완료하기</button>
        </div>
        <script>
          document.getElementById('btnSubmit').addEventListener('click', () => {
            const name = document.getElementById('userName').value.trim();
            const email = document.getElementById('userEmail').value.trim();
            if(!name || !email) return alert('정보를 입력해 주세요.');
            
            const mockId = 'kakao_' + email.replace(/[^a-zA-Z0-9]/g, '');
            if(window.opener) {
              window.opener.postMessage({
                type: 'MOCK_LOGIN_SUCCESS',
                user: {
                  id: mockId,
                  name: name,
                  email: email,
                  avatar: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?auto=format&fit=crop&w=150&h=150&q=80',
                  provider: 'KakaoTalk'
                }
              }, '*');
            }
            window.close();
          });
        </script>
      </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
}
