"use client";

import {
  useState,
  useTransition,
} from "react";
import { useRouter } from "next/navigation";
import {
  KeyRound,
  Loader2,
  LockKeyhole,
  LogOut,
  ShieldCheck,
} from "lucide-react";

import {
  logoutAction,
} from "@/app/logout/actions";

type LogoutAnimationPhase =
  | "idle"
  | "closing"
  | "locking"
  | "locked";

export default function LogoutButton() {
  const router = useRouter();

  const [
    isPending,
    startTransition,
  ] = useTransition();

  const [
    animationPhase,
    setAnimationPhase,
  ] =
    useState<LogoutAnimationPhase>(
      "idle"
    );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState<string | null>(
    null
  );

  const animationActive =
    animationPhase !== "idle";

  function handleLogout() {
    if (
      isPending ||
      animationActive
    ) {
      return;
    }

    setErrorMessage(null);

    setAnimationPhase(
      "closing"
    );

    window.setTimeout(() => {
      setAnimationPhase(
        "locking"
      );
    }, 700);

    window.setTimeout(() => {
      startTransition(
        async () => {
          const result =
            await logoutAction();

          if (!result.success) {
            setAnimationPhase(
              "idle"
            );

            setErrorMessage(
              result.message
            );

            return;
          }

          setAnimationPhase(
            "locked"
          );

          window.setTimeout(() => {
            router.replace(
              "/login"
            );

            router.refresh();
          }, 900);
        }
      );
    }, 1450);
  }

  return (
    <>
      <div className="logout-control">
        <button
          type="button"
          onClick={handleLogout}
          disabled={
            isPending ||
            animationActive
          }
          className="logout-button"
        >
          {isPending ? (
            <>
              <Loader2
                size={15}
                className="logout-spinner"
                aria-hidden="true"
              />

              Locking...
            </>
          ) : (
            <>
              <LogOut
                size={15}
                aria-hidden="true"
              />

              Logout
            </>
          )}
        </button>

        {errorMessage ? (
          <p
            className="logout-error"
            role="alert"
          >
            {errorMessage}
          </p>
        ) : null}
      </div>

      {animationActive ? (
        <div
          className="logout-vault-overlay"
          role="status"
          aria-live="assertive"
        >
          <div className="logout-vault-stage">
            <div
              className={`logout-vault ${
                animationPhase ===
                "closing"
                  ? "vault-closing"
                  : ""
              } ${
                animationPhase ===
                  "locking" ||
                animationPhase ===
                  "locked"
                  ? "vault-locked"
                  : ""
              }`}
            >
              <div className="logout-vault-body">
                <div className="logout-vault-inner">
                  <ShieldCheck
                    size={46}
                  />
                </div>

                <div className="logout-vault-door">
                  <div className="logout-vault-ring">
                    <div className="logout-vault-lock">
                      <LockKeyhole
                        size={25}
                      />
                    </div>

                    <span className="logout-spoke logout-spoke-one" />
                    <span className="logout-spoke logout-spoke-two" />
                    <span className="logout-spoke logout-spoke-three" />
                    <span className="logout-spoke logout-spoke-four" />
                  </div>
                </div>
              </div>

              <div
                className={`logout-key ${
                  animationPhase ===
                    "locking" ||
                  animationPhase ===
                    "locked"
                    ? "logout-key-lock"
                    : ""
                }`}
              >
                <KeyRound
                  size={40}
                />
              </div>
            </div>

            <div className="logout-status">
              {animationPhase ===
              "closing" ? (
                <>
                  <span className="logout-status-dot" />
                  Closing Session
                </>
              ) : null}

              {animationPhase ===
              "locking" ? (
                <>
                  <span className="logout-status-dot" />
                  Securing Access
                </>
              ) : null}

              {animationPhase ===
              "locked" ? (
                <div className="logout-session-locked">
                  <LockKeyhole
                    size={21}
                  />

                  <span>
                    Session Locked
                  </span>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <style>{`
        .logout-control {
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 6px;
        }

        .logout-button {
          height: 36px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 7px;
          padding: 0 13px;
          border: 1px solid #e4e4e7;
          border-radius: 999px;
          background: #ffffff;
          color: #52525b;
          font-size: 12px;
          font-weight: 650;
          cursor: pointer;
          transition:
            border-color 160ms ease,
            background 160ms ease,
            color 160ms ease,
            transform 160ms ease;
        }

        .logout-button:hover:not(:disabled) {
          border-color: #d4d4d8;
          background: #fafafa;
          color: #18181b;
          transform: translateY(-1px);
        }

        .logout-button:active:not(:disabled) {
          transform: translateY(0);
        }

        .logout-button:disabled {
          cursor: not-allowed;
          opacity: 0.6;
        }

        .logout-spinner {
          animation:
            logoutSpin
            700ms linear infinite;
        }

        .logout-error {
          max-width: 220px;
          margin: 0;
          color: #dc2626;
          font-size: 11px;
          font-weight: 600;
          line-height: 1.45;
        }

        .logout-vault-overlay {
          position: fixed;
          inset: 0;
          z-index: 9999;
          display: grid;
          place-items: center;
          padding: 24px;
          background:
            rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(12px);
        }

        .logout-vault-stage {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 34px;
        }

        .logout-vault {
          position: relative;
          width: 220px;
          height: 220px;
          perspective: 900px;
        }

        .logout-vault-body {
          position: absolute;
          inset: 0;
          border: 5px solid #18181b;
          border-radius: 32px;
          background: #d4d4d8;
          box-shadow:
            0 30px 70px
            rgba(24, 24, 27, 0.18);
        }

        .logout-vault-inner {
          position: absolute;
          inset: 18px;
          display: grid;
          place-items: center;
          border-radius: 22px;
          background: #18181b;
          color: #c99732;
        }

        .logout-vault-door {
          position: absolute;
          inset: -5px;
          z-index: 3;
          display: grid;
          place-items: center;
          transform-origin: left center;
          transform:
            rotateY(-82deg);
          transform-style:
            preserve-3d;
          border: 5px solid #18181b;
          border-radius: 32px;
          background:
            linear-gradient(
              145deg,
              #ffffff,
              #e4e4e7
            );
          backface-visibility:
            hidden;
          transition:
            transform 700ms
            cubic-bezier(
              0.22,
              1,
              0.36,
              1
            );
        }

        .vault-closing
        .logout-vault-door,
        .vault-locked
        .logout-vault-door {
          transform:
            rotateY(0deg);
        }

        .logout-vault-ring {
          position: relative;
          width: 116px;
          height: 116px;
          border: 8px solid #a1a1aa;
          border-radius: 999px;
          background: #fafafa;
          transition:
            transform
            500ms ease;
        }

        .vault-locked
        .logout-vault-ring {
          transform:
            rotate(-45deg);
        }

        .logout-vault-lock {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 48px;
          height: 48px;
          display: grid;
          place-items: center;
          transform:
            translate(-50%, -50%);
          border-radius: 999px;
          background: #18181b;
          color: #ffffff;
        }

        .logout-spoke {
          position: absolute;
          left: 50%;
          top: 50%;
          width: 7px;
          height: 38px;
          margin-left: -3.5px;
          margin-top: -19px;
          border-radius: 999px;
          background: #71717a;
          transform-origin:
            center center;
        }

        .logout-spoke-one {
          transform:
            translateY(-48px);
        }

        .logout-spoke-two {
          transform:
            rotate(90deg)
            translateY(-48px);
        }

        .logout-spoke-three {
          transform:
            rotate(180deg)
            translateY(-48px);
        }

        .logout-spoke-four {
          transform:
            rotate(270deg)
            translateY(-48px);
        }

        .logout-key {
          position: absolute;
          z-index: 6;
          left: 93px;
          top: 88px;
          color: #b88925;
          opacity: 0;
          transform:
            rotate(0deg);
          transition:
            opacity 240ms ease,
            transform 520ms ease;
        }

        .logout-key-lock {
          opacity: 1;
          transform:
            rotate(-90deg);
        }

        .logout-status {
          min-height: 34px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 9px;
          color: #71717a;
          font-size: 13px;
          font-weight: 650;
          letter-spacing: 0.03em;
        }

        .logout-status-dot {
          width: 8px;
          height: 8px;
          border-radius: 999px;
          background: #b88925;
          animation:
            logoutPulse
            850ms ease-in-out
            infinite alternate;
        }

        .logout-session-locked {
          display: flex;
          align-items: center;
          gap: 9px;
          color: #18181b;
          font-size: 15px;
          font-weight: 750;
          animation:
            logoutLocked
            360ms ease both;
        }

        @keyframes logoutSpin {
          to {
            transform:
              rotate(360deg);
          }
        }

        @keyframes logoutPulse {
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

        @keyframes logoutLocked {
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
          .logout-vault {
            width: 180px;
            height: 180px;
          }

          .logout-vault-ring {
            width: 96px;
            height: 96px;
          }

          .logout-key {
            left: 75px;
            top: 70px;
          }

          .logout-spoke {
            height: 30px;
            margin-top: -15px;
          }

          .logout-spoke-one {
            transform:
              translateY(-40px);
          }

          .logout-spoke-two {
            transform:
              rotate(90deg)
              translateY(-40px);
          }

          .logout-spoke-three {
            transform:
              rotate(180deg)
              translateY(-40px);
          }

          .logout-spoke-four {
            transform:
              rotate(270deg)
              translateY(-40px);
          }
        }

        @media (
          prefers-reduced-motion:
          reduce
        ) {
          .logout-vault-door,
          .logout-vault-ring,
          .logout-key,
          .logout-button {
            transition: none;
          }

          .logout-spinner,
          .logout-status-dot,
          .logout-session-locked {
            animation: none;
          }
        }
      `}</style>
    </>
  );
}