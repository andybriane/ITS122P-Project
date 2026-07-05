import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import authService from '../../services/authService';
import '../../assets/css/pages/login.css';

export default function Login() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState(false);
  const [otpValues, setOtpValues] = useState(['', '', '', '', '', '']);
  const otpRefs = useRef([]);
  const navigate = useNavigate();

  const handleShowOTP = async () => {
    if (!email || !password) {
      alert('Please enter your email and password.');
      return;
    }

    if (!captcha) {
      alert('Please verify you are not a robot.');
      return;
    }

    setIsLoading(true);

    try {
      // Step 1: verify credentials against the real backend
      const loginResult = await authService.login({ email, password });

      if (!loginResult.success) {
        alert(loginResult.message || 'Invalid email or password.');
        return;
      }

      // Step 2: credentials are good, ask backend to issue an OTP
      const otpResult = await authService.requestOTP(email);

      if (!otpResult.success) {
        alert(otpResult.message || 'Could not send verification code.');
        return;
      }

      // Dev mode only: backend returns the OTP directly since there's no real
      // SMS/email provider hooked up yet. Logging it so testing doesn't require
      // checking the database every time.
      console.log('[DEV] OTP code:', otpResult.data?.otp);

      setStep(2);
      setTimeout(() => {
        otpRefs.current[0]?.focus();
      }, 100);
    } catch (error) {
      alert('Could not reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpCode = otpValues.join('');
    if (otpCode.length !== 6) {
      alert('Please enter the complete 6-digit code.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await authService.verifyOTP(email, otpCode);

      if (!result.success) {
        alert(result.message || 'Invalid OTP. Please try again.');
        return;
      }

      // Store the real session token + user info for the rest of the app to use
      localStorage.setItem('authToken', result.data.token);
      localStorage.setItem('authUser', JSON.stringify(result.data.user));

      navigate('/dashboard');
    } catch (error) {
      alert('Could not reach the server. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOtpChange = useCallback((index, value) => {
    // Only allow numbers
    const cleaned = value.replace(/[^0-9]/g, '');
    if (!cleaned) return;

    setOtpValues((prev) => {
      const next = [...prev];
      next[index] = cleaned.charAt(0);
      return next;
    });

    // Auto-jump to next
    if (index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  }, []);

  const handleOtpKeyDown = useCallback((index, e) => {
    if (e.key === 'Backspace' && !otpValues[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  }, [otpValues]);

  const handleOtpPaste = useCallback((e) => {
    e.preventDefault();
    const paste = (e.clipboardData || window.clipboardData).getData('text');
    const digits = paste.replace(/\D/g, '').slice(0, 6);

    setOtpValues(digits.split('').concat(['', '', '', '', '', '']).slice(0, 6));

    const nextIdx = Math.min(digits.length, 5);
    setTimeout(() => {
      otpRefs.current[nextIdx]?.focus();
    }, 0);
  }, []);

  const handleResendCode = async () => {
    try {
      const result = await authService.resendOTP(email);
      if (result.success) {
        console.log('[DEV] New OTP code:', result.data?.otp);
        alert('A new 6-digit code has been sent to your email.');
      } else {
        alert(result.message || 'Could not resend code.');
      }
    } catch (error) {
      alert('Could not reach the server. Please try again.');
    }
  };

  return (
    <div className="login-page">
      <div className="login-container">
        <div className="login-card">
          <div className="login-header">
            {/* 🚨 UPDATED LOGO BRANDING 🚨 */}
            <Link to="/" className="logo">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ verticalAlign: 'middle', marginRight: '0.5rem' }}>
                <path d="M12 2C8.5 2 6 4 6 7c0 2 1 3 1 5s-1 4-1 6c0 3 2 4 4 4 1.5 0 2-1 2-2s.5-2 2-2 2 1 2 2 .5 2 2 2c2 0 4-1 4-4 0-2-1-4-1-6s1-3 1-5c0-3-2.5-5-6-5z"/>
              </svg>
              Pineda Dental Clinic
            </Link>
            <h1 className="login-title">Staff Portal</h1>
            <p className="login-subtitle">Secure access for authorized personnel only</p>
          </div>

          <form className="login-form" onSubmit={(e) => e.preventDefault()}>
            {/* Step 1: Credentials */}
            <div className={`login-step${step === 1 ? ' active' : ''}`} id="loginStep1">
              <div className="form-group">
                <label htmlFor="loginEmail">Email Address</label>
                <input
                  type="email"
                  id="loginEmail"
                  name="email"
                  required
                  placeholder="Enter your email address"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label htmlFor="loginPassword">Password</label>
                <input
                  type="password"
                  id="loginPassword"
                  name="password"
                  required
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>
              <div className="captcha-box">
                <label className="captcha-checkbox">
                  <input type="checkbox" id="captcha" required checked={captcha} onChange={(e) => setCaptcha(e.target.checked)} />
                  <span>I am not a robot</span>
                </label>
                <span className="captcha-logo">reCAPTCHA</span>
              </div>
              <button type="button" className="btn btn-primary btn-full" onClick={handleShowOTP} disabled={isLoading}>
                {isLoading ? <><span className="spinner"></span> Sending Code...</> : 'Continue'}
              </button>
              <a href="#" className="forgot-password">Forgot password?</a>
            </div>

            {/* Step 2: OTP */}
            <div className={`login-step${step === 2 ? ' active' : ''}`} id="loginStep2">
              <div className="otp-header">
                <h2>Two-Factor Authentication</h2>
                <p>Please enter the 6-digit code sent to your registered device</p>
              </div>
              <div className="otp-inputs">
                {otpValues.map((val, idx) => (
                  <input
                    key={idx}
                    type="text"
                    maxLength={1}
                    className="otp-input"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    aria-label={`Digit ${idx + 1}`}
                    value={val}
                    ref={(el) => { otpRefs.current[idx] = el; }}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(idx, e)}
                    onPaste={idx === 0 ? handleOtpPaste : undefined}
                  />
                ))}
              </div>
              <button type="button" className="btn btn-primary btn-full" onClick={handleVerifyOTP} disabled={isLoading}>
                {isLoading ? <><span className="spinner"></span> Verifying...</> : 'Verify & Login'}
              </button>
              <p className="resend-code">
                Did not receive the code?
                <a href="#" onClick={(e) => { e.preventDefault(); handleResendCode(); }}>Resend</a>
              </p>
            </div>
          </form>

          <div className="login-security-footer">
            <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
            </svg>
            <span>Secured via 256-bit Encryption</span>
          </div>
        </div>

        <Link to="/" className="back-to-site">
          <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <line x1="19" y1="12" x2="5" y2="12"></line>
            <polyline points="12 19 5 12 12 5"></polyline>
          </svg>
          Back to Website
        </Link>
      </div>
    </div>
  );
}