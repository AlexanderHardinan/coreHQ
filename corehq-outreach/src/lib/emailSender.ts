export function getDefaultSender() {
  return {
    from: process.env.EMAIL_FROM || "CoreHQ <onboarding@resend.dev>",
    replyTo: process.env.EMAIL_REPLY_TO || "",
  };
}