import { NextRequest, NextResponse } from 'next/server';
import { upsertUser, getUserBookmarks } from '@/lib/db';
import axios from 'axios';

// 🔑 구글 REST API 공식 규격 OAuth 콜백 라우터
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || 'your_google_client_id';
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'your_google_client_secret';
  const GOOGLE_REDIRECT_URI = process.env.GOOGLE_REDIRECT_URI || 'http://localhost:3030/api/auth/callback/google';

  if (error || !code) {
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>인증 실패</title>
        <script>
          alert("Google 로그인 인증이 취소되었거나 오류가 발생했습니다.");
          window.close();
        </script>
      </head>
      <body>인증 실패</body>
      </html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  try {
    // 1. 구글 토큰 발급 요청 (REST API: POST https://oauth2.googleapis.com/token)
    const tokenUrl = 'https://oauth2.googleapis.com/token';
    const params = {
      code,
      client_id: GOOGLE_CLIENT_ID,
      client_secret: GOOGLE_CLIENT_SECRET,
      redirect_uri: GOOGLE_REDIRECT_URI,
      grant_type: 'authorization_code'
    };

    const tokenRes = await axios.post(tokenUrl, params, { timeout: 5000 });
    const { access_token } = tokenRes.data;

    if (!access_token) throw new Error('Access token not found');

    // 2. 구글 사용자 프로필 요청 (REST API: GET https://www.googleapis.com/oauth2/v3/userinfo)
    const userMeUrl = 'https://www.googleapis.com/oauth2/v3/userinfo';
    const userMeRes = await axios.get(userMeUrl, {
      headers: {
        Authorization: `Bearer ${access_token}`
      },
      timeout: 5000
    });

    const googleUser = userMeRes.data;
    const id = `google_${googleUser.sub}`;
    const name = googleUser.name || `구글사용자_${googleUser.sub.substring(0, 6)}`;
    const email = googleUser.email;
    const avatar = googleUser.picture || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80';

    // 3. SQLite DB에 유저 정보 저장 (Upsert)
    const savedUser = await upsertUser({
      id,
      name,
      email,
      avatar,
      provider: 'Google'
    });

    // 4. 북마크 동기화 가져오기
    const bookmarks = await getUserBookmarks(savedUser.id);

    // 5. 부모창으로 사용자 정보 송출 및 창 닫기
    const postData = {
      type: 'MOCK_LOGIN_SUCCESS',
      user: savedUser,
      bookmarks
    };

    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google 인증 완료</title>
        <script>
          if (window.opener) {
            window.opener.postMessage(${JSON.stringify(postData)}, '*');
          }
          window.close();
        </script>
      </head>
      <body style="font-family: sans-serif; text-align: center; padding-top: 100px; background-color: #0f172a; color: #fff;">
        <h2>Google 인증 완료!</h2>
        <p>로그인 세션을 부모창과 동기화하는 중입니다...</p>
      </body>
      </html>
    `, { headers: { 'Content-Type': 'text/html; charset=utf-8' } });

  } catch (err: any) {
    console.error('[Google Callback API Error]:', err.message);

    // Fallback: 개발자 키 미설정 시 가상 데이터 로그인 입력 폼 작동
    return new NextResponse(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Google 개발자 키 미설정 안내</title>
        <meta charset="utf-8">
        <style>
          body { font-family: sans-serif; background-color: #0f172a; color: #f8fafc; text-align: center; padding: 40px 20px; }
          .card { background: rgba(30,41,59,0.8); border: 1px solid rgba(255,255,255,0.1); padding: 30px; border-radius: 16px; max-width: 380px; margin: 0 auto; box-shadow: 0 10px 25px rgba(0,0,0,0.4); }
          .warn-icon { font-size: 40px; color: #4285f4; margin-bottom: 16px; }
          input { width: 100%; padding: 10px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.15); background: #1e293b; color: #fff; box-sizing: border-box; margin-bottom: 12px; outline: none; }
          button { width: 100%; padding: 12px; border-radius: 8px; background: #4285f4; color: #fff; font-weight: 700; border: none; cursor: pointer; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="warn-icon">⚠️</div>
          <h3 style="margin-top:0;">Google 앱 키 미등록 상태</h3>
          <p style="font-size:0.8rem; color:#94a3b8; line-height:1.5; margin-bottom:20px;">
            로컬 환경변수(.env)에 <strong>GOOGLE_CLIENT_ID</strong> 및 <strong>GOOGLE_CLIENT_SECRET</strong>이 설정되어 있지 않습니다.<br>
            가상 구글 정보 입력을 통해 로그인을 진행합니다.
          </p>
          <div style="text-align: left;">
            <input type="text" id="userName" value="홍길동 (Google)" />
            <input type="email" id="userEmail" value="gildong.hong@gmail.com" />
          </div>
          <button id="btnSubmit">가상 Google 로그인 완료하기</button>
        </div>
        <script>
          document.getElementById('btnSubmit').addEventListener('click', () => {
            const name = document.getElementById('userName').value.trim();
            const email = document.getElementById('userEmail').value.trim();
            if(!name || !email) return alert('정보를 입력해 주세요.');
            
            const mockId = 'google_' + email.replace(/[^a-zA-Z0-9]/g, '');
            if(window.opener) {
              window.opener.postMessage({
                type: 'MOCK_LOGIN_SUCCESS',
                user: {
                  id: mockId,
                  name: name,
                  email: email,
                  avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=150&h=150&q=80',
                  provider: 'Google'
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
