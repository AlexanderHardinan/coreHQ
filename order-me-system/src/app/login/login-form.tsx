"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import {
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { loginAction } from "./actions";

type AnimationPhase =
  | "idle"
  | "keying"
  | "turning"
  | "opening"
  | "granted";

export default function LoginForm() {
  const router = useRouter();

  const [state, formAction, isPending] =
    useActionState(loginAction, null);

  const [password, setPassword] =
    useState("");

  const [showPassword, setShowPassword] =
    useState(false);

  const [hideError, setHideError] =
    useState(false);

  const [animationPhase, setAnimationPhase] =
    useState<AnimationPhase>("idle");

  const animationStartedRef =
    useRef(false);

  useEffect(() => {
    if (
      !state?.success ||
      animationStartedRef.current
    ) {
      return;
    }

    animationStartedRef.current = true;

    setAnimationPhase("keying");

    const turningTimer = window.setTimeout(() => {
      setAnimationPhase("turning");
    }, 650);

    const openingTimer = window.setTimeout(() => {
      setAnimationPhase("opening");
    }, 1300);

    const grantedTimer = window.setTimeout(() => {
      setAnimationPhase("granted");
    }, 2100);

    const navigationTimer =
      window.setTimeout(() => {
        router.replace("/");
        router.refresh();
      }, 2900);

    return () => {
      window.clearTimeout(turningTimer);
      window.clearTimeout(openingTimer);
      window.clearTimeout(grantedTimer);
      window.clearTimeout(navigationTimer);
    };
  }, [router, state?.success]);

  const animationActive =
    animationPhase !== "idle";

  const showError =
    Boolean(
      state &&
        !state.success &&
        !hideError &&
        !isPending
    );

  return (
    <>
      <div className="order-me-login">
        <div className="login-panel">
          <div className="brand-mark">
            <div className="brand-icon">
              <LockKeyhole size={24} />
            </div>

            <div>
              <p className="brand-title">
                Order Me System by Forza
              </p>

              <p className="brand-subtitle">
                Human and Technology System
              </p>
            </div>
          </div>

          <div className="login-heading">
            <span className="eyebrow">
              Secure Access
            </span>

            <h1>Enter the system</h1>

            <p>
              Enter your authorized access password
              to continue.
            </p>
          </div>

          <form
            action={formAction}
            className="login-form"
            onSubmit={() => {
              setHideError(false);
            }}
          >
            <label
              className="field-label"
              htmlFor="password"
            >
              Password
            </label>

            <div
              className={`password-field ${
                showError ? "field-error" : ""
              }`}
            >
              <input
                id="password"
                name="password"
                type={
                  showPassword
                    ? "text"
                    : "password"
                }
                autoComplete="current-password"
                autoFocus
                value={password}
                disabled={
                  isPending ||
                  animationActive
                }
                onChange={(event) => {
                  setPassword(
                    event.target.value
                  );
                  setHideError(true);
                }}
                placeholder="Enter access password"
                maxLength={256}
                required
              />

              <button
                type="button"
                className="password-toggle"
                aria-label={
                  showPassword
                    ? "Hide password"
                    : "Show password"
                }
                disabled={
                  isPending ||
                  animationActive
                }
                onClick={() => {
                  setShowPassword(
                    (current) => !current
                  );
                }}
              >
                {showPassword ? (
                  <EyeOff size={19} />
                ) : (
                  <Eye size={19} />
                )}
              </button>
            </div>

            <div
              className="feedback-area"
              aria-live="polite"
            >
              {showError ? (
                <p className="error-message">
                  {state?.message ||
                    "Invalid password."}
                </p>
              ) : null}

              {isPending ? (
                <p className="pending-message">
                  Verifying access...
                </p>
              ) : null}
            </div>

            <button
              type="submit"
              className="unlock-button"
              disabled={
                isPending ||
                animationActive ||
                password.length === 0
              }
            >
              {isPending ? (
                <>
                  <span className="button-spinner" />
                  Verifying
                </>
              ) : (
                <>
                  <KeyRound size={18} />
                  Unlock
                </>
              )}
            </button>
          </form>

          <div className="security-note">
            <ShieldCheck size={16} />

            <span>
              Protected operational access
            </span>
          </div>

          <p className="developer-credit">
            Developed by Chef Alex
          </p>
        </div>

        {animationActive ? (
          <div
            className="vault-overlay"
            role="status"
            aria-live="assertive"
          >
            <div className="vault-stage">
              <div
                className={`vault ${
                  animationPhase ===
                    "opening" ||
                  animationPhase ===
                    "granted"
                    ? "vault-open"
                    : ""
                }`}
              >
                <div className="vault-body">
                  <div className="vault-inner">
                    <ShieldCheck size={48} />
                  </div>

                  <div className="vault-door">
                    <div className="vault-door-ring">
                      <div className="vault-lock">
                        <LockKeyhole
                          size={26}
                        />
                      </div>

                      <span className="vault-spoke vault-spoke-one" />
                      <span className="vault-spoke vault-spoke-two" />
                      <span className="vault-spoke vault-spoke-three" />
                      <span className="vault-spoke vault-spoke-four" />
                    </div>
                  </div>
                </div>

                <div
                  className={`vault-key ${
                    animationPhase ===
                    "keying"
                      ? "key-enter"
                      : ""
                  } ${
                    animationPhase ===
                      "turning" ||
                    animationPhase ===
                      "opening" ||
                    animationPhase ===
                      "granted"
                      ? "key-turn"
                      : ""
                  }`}
                >
                  <KeyRound size={42} />
                </div>
              </div>

              <div className="vault-status">
                {animationPhase ===
                "keying" ? (
                  <>
                    <span className="status-dot" />
                    Verifying
                  </>
                ) : null}

                {animationPhase ===
                "turning" ? (
                  <>
                    <span className="status-dot" />
                    Unlocking
                  </>
                ) : null}

                {animationPhase ===
                "opening" ? (
                  <>
                    <span className="status-dot" />
                    Opening
                  </>
                ) : null}

                {animationPhase ===
                "granted" ? (
                  <div className="access-granted">
                    <ShieldCheck size={22} />
                    <span>
                      Access Granted
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <style>{`
        .order-me-login {
          width: 100%;
        }

        .login-panel {
          width: min(100%, 430px);
          margin: 0 auto;
          padding: 34px;
          background: #ffffff;
          border: 1px solid #e5e7eb;
          border-radius: 24px;
          box-shadow:
            0 24px 60px rgba(15, 23, 42, 0.08);
        }

        .brand-mark {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-bottom: 42px;
        }

        .brand-icon {
          width: 46px;
          height: 46px;
          display: grid;
          place-items: center;
          border-radius: 14px;
          background: #111827;
          color: #ffffff;
        }

        .brand-title {
          margin: 0;
          color: #111827;
          font-size: 14px;
          font-weight: 700;
          line-height: 1.35;
        }

        .brand-subtitle {
          margin: 2px 0 0;
          color: #6b7280;
          font-size: 12px;
          line-height: 1.4;
        }

        .login-heading {
          margin-bottom: 28px;
        }

        .eyebrow {
          display: inline-block;
          margin-bottom: 8px;
          color: #9a6b16;
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.14em;
          text-transform: uppercase;
        }

        .login-heading h1 {
          margin: 0;
          color: #111827;
          font-size: clamp(
            28px,
            6vw,
            36px
          );
          font-weight: 750;
          letter-spacing: -0.04em;
          line-height: 1.08;
        }

        .login-heading p {
          margin: 12px 0 0;
          color: #6b7280;
          font-size: 14px;
          line-height: 1.7;
        }

        .login-form {
          display: flex;
          flex-direction: column;
        }

        .field-label {
          margin-bottom: 8px;
          color: #374151;
          font-size: 13px;
          font-weight: 650;
        }

        .password-field {
          position: relative;
          display: flex;
          align-items: center;
          border: 1px solid #d1d5db;
          border-radius: 14px;
          background: #ffffff;
          transition:
            border-color 160ms ease,
            box-shadow 160ms ease;
        }

        .password-field:focus-within {
          border-color: #111827;
          box-shadow:
            0 0 0 3px
            rgba(17, 24, 39, 0.08);
        }

        .password-field.field-error {
          border-color: #dc2626;
        }

        .password-field.field-error:focus-within {
          box-shadow:
            0 0 0 3px
            rgba(220, 38, 38, 0.08);
        }

        .password-field input {
          width: 100%;
          height: 52px;
          padding:
            0 52px
            0 16px;
          border: 0;
          outline: none;
          background: transparent;
          color: #111827;
          font-size: 15px;
        }

        .password-field input::placeholder {
          color: #9ca3af;
        }

        .password-field input:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .password-toggle {
          position: absolute;
          right: 8px;
          width: 38px;
          height: 38px;
          display: grid;
          place-items: center;
          border: 0;
          border-radius: 10px;
          background: transparent;
          color: #6b7280;
          cursor: pointer;
          transition:
            background 160ms ease,
            color 160ms ease;
        }

        .password-toggle:hover:not(:disabled) {
          background: #f3f4f6;
          color: #111827;
        }

        .password-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .feedback-area {
          min-height: 34px;
          display: flex;
          align-items: center;
          padding-top: 7px;
        }

        .error-message,
        .pending-message {
          margin: 0;
          font-size: 12px;
          line-height: 1.45;
        }

        .error-message {
          color: #dc2626;
        }

        .pending-message {
          color: #6b7280;
        }

        .unlock-button {
          min-height: 52px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          border: 0;
          border-radius: 14px;
          background: #111827;
          color: #ffffff;
          font-size: 14px;
          font-weight: 700;
          cursor: pointer;
          transition:
            transform 160ms ease,
            opacity 160ms ease,
            background 160ms ease;
        }

        .unlock-button:hover:not(:disabled) {
          background: #000000;
          transform: translateY(-1px);
        }

        .unlock-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .unlock-button:disabled {
          cursor: not-allowed;
          opacity: 0.55;
        }

        .button-spinner {
          width: 17px;
          height: 17px;
          border: 2px solid
            rgba(255, 255, 255, 0.35);
          border-top-color: #ffffff;
          border-radius: 999px;
          animation:
            orderMeSpin 700ms linear
            infinite;
        }

        .security-note {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          margin-top: 22px;
          color: #9ca3af;
          font-size: 11px;
        }

        .developer-credit {
          margin:
            22px
            0 0;
          padding-top: 18px;
          border-top: 1px solid #f0f1f3;
          color: #9ca3af;
          font-size: 11px;
          text-align: center;
        }

        .vault-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            rgba(255, 255, 255, 0.94);
          backdrop-filter: blur(12px);
        }

        .vault-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 34px;
        }

        .vault {
          position: relative;
          width: 220px;
          height: 220px;
          perspective: 900px;
        }

        .vault-body {
          position: absolute;
          inset: 0;
          overflow: visible;
          border: 5px solid #111827;
          border-radius: 32px;
          background: #d1d5db;
          box-shadow:
            0 30px 70px
            rgba(17, 24, 39, 0.18);
        }

        .vault-inner {
          position: absolute;
          inset: 18px;
          display: grid;
          place-items: center;
          border-radius: 22px;
          background: #111827;
          color: #d3a847;
        }

        .vault-door {
          position: absolute;
          inset: -5px;
          z-index: 3;
          display: grid;
          place-items: center;
          transform-origin: left center;
          transform-style:
            preserve-3d;
          border: 5px solid #111827;
          border-radius: 32px;
          background:
            linear-gradient(
              145deg,
              #ffffff,
              #e5e7eb
            );
          backface-visibility: hidden;
          transition:
            transform 760ms
            cubic-bezier(
              0.22,
              1,
              0.36,
              1
            );
        }

        .vault-open .vault-door {
          transform:
            rotateY(-82deg);
        }

        .vault-door-ring {
          position: relative;
          width: 116px;
          height: 116px;
          border: 8px solid #9ca3af;
          border-radius: 999px;
          background: #f9fafb;
        }

        .vault-lock {
          position: absolute;
          inset: 50%;
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          transform:
            translate(-50%, -50%);
          border-radius: 999px;
          background: #111827;
          color: #ffffff;
        }

        .vault-spoke {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 7px;
          height: 38px;
          margin-left: -3.5px;
          margin-top: -19px;
          border-radius: 99px;
          background: #6b7280;
          transform-origin:
            center center;
        }

        .vault-spoke-one {
          transform:
            translateY(-48px);
        }

        .vault-spoke-two {
          transform:
            rotate(90deg)
            translateY(-48px);
        }

        .vault-spoke-three {
          transform:
            rotate(180deg)
            translateY(-48px);
        }

        .vault-spoke-four {
          transform:
            rotate(270deg)
            translateY(-48px);
        }

        .vault-key {
          position: absolute;
          z-index: 6;
          left: -85px;
          top: 90px;
          color: #b88925;
          transform:
            translateX(0)
            rotate(0deg);
          transition:
            transform 650ms
            cubic-bezier(
              0.22,
              1,
              0.36,
              1
            );
        }

        .vault-key.key-enter {
          transform:
            translateX(178px)
            rotate(0deg);
        }

        .vault-key.key-turn {
          transform:
            translateX(178px)
            rotate(90deg);
        }

        .vault-status {
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #6b7280;
          font-size: 13px;
          font-weight: 650;
          letter-spacing: 0.03em;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #b88925;
          animation:
            orderMePulse
            850ms ease-in-out
            infinite alternate;
        }

        .access-granted {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #166534;
          font-size: 15px;
          font-weight: 750;
          animation:
            orderMeGranted
            400ms ease both;
        }

        @keyframes orderMeSpin {
          to {
            transform:
              rotate(360deg);
          }
        }

        @keyframes orderMePulse {
          from {
            opacity: 0.35;
            transform:
              scale(0.85);
          }

          to {
            opacity: 1;
            transform:
              scale(1.15);
          }
        }

        @keyframes orderMeGranted {
          from {
            opacity: 0;
            transform:
              translateY(6px);
          }

          to {
            opacity: 1;
            transform:
              translateY(0);
          }
        }

        @media (
          max-width: 520px
        ) {
          .login-panel {
            padding: 26px 20px;
            border-radius: 20px;
          }

          .brand-mark {
            margin-bottom: 34px;
          }

          .vault {
            width: 180px;
            height: 180px;
          }

          .vault-key {
            left: -72px;
            top: 72px;
          }

          .vault-key.key-enter,
          .vault-key.key-turn {
            transform:
              translateX(148px)
              rotate(0deg);
          }

          .vault-key.key-turn {
            transform:
              translateX(148px)
              rotate(90deg);
          }

          .vault-door-ring {
            width: 96px;
            height: 96px;
          }

          .vault-spoke {
            height: 30px;
            margin-top: -15px;
          }

          .vault-spoke-one {
            transform:
              translateY(-40px);
          }

          .vault-spoke-two {
            transform:
              rotate(90deg)
              translateY(-40px);
          }

          .vault-spoke-three {
            transform:
              rotate(180deg)
              translateY(-40px);
          }

          .vault-spoke-four {
            transform:
              rotate(270deg)
              translateY(-40px);
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .vault-door,
          .vault-key,
          .unlock-button {
            transition: none;
          }

          .button-spinner,
          .status-dot,
          .access-granted {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}