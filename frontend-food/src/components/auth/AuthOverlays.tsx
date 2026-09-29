/** Global auth UI mounted once next to <App />: login prompt and first-login onboarding. */
import LoginDialog from '@/components/auth/LoginDialog';
import OnboardingDialog from '@/components/auth/OnboardingDialog';

export default function AuthOverlays() {
  return (
    <>
      <LoginDialog />
      <OnboardingDialog />
    </>
  );
}
