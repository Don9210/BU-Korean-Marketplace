import { Navigate, Route, Routes } from 'react-router-dom'
import AppLayout from './components/AppLayout'
import AuthLayout from './components/AuthLayout'
import ListingDetailPage from './pages/ListingDetailPage'
import ListingFormPage from './pages/ListingFormPage'
import ListPage from './pages/ListPage'
import LoginPage from './pages/LoginPage'
import MyActivityPage from './pages/MyActivityPage'
import ProfileSetupPage from './pages/ProfileSetupPage'
import VerifyCodePage from './pages/VerifyCodePage'

// 라우터: "어느 주소에서 어느 화면을 보여 줄지" 정하는 곳.
// 셋이 함께 쓰는 공유 파일이다. 고치면 단톡에 한 줄 남긴다.
//
// TODO(기능 1 · 인증): 로그인하지 않은 사람은 /login 으로, 닉네임이 없는 사람은
// /profile-setup 으로 보내는 검사를 여기에 추가한다. 지금은 모든 화면이 그냥 열린다.
export default function App() {
  return (
    <Routes>
      {/* 로그인 전 화면 3개 (아래 메뉴 없음) */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/verify" element={<VerifyCodePage />} />
        <Route path="/profile-setup" element={<ProfileSetupPage />} />
      </Route>

      {/* 로그인 후 화면 4개 (아래 메뉴 있음) */}
      <Route element={<AppLayout />}>
        <Route path="/" element={<ListPage />} />
        <Route path="/listings/new" element={<ListingFormPage />} />
        <Route path="/listings/:id" element={<ListingDetailPage />} />
        <Route path="/listings/:id/edit" element={<ListingFormPage />} />
        <Route path="/me" element={<MyActivityPage />} />
      </Route>

      {/* 없는 주소는 홈으로 */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
