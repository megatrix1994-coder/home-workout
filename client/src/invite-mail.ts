const SUBJECT = 'Your Home Workout invite';

function inviteBody(url: string) {
  return `You're invited to Home Workout. Open this link to create your account:\n\n${url}\n\nThe link works once and lasts 7 days.`;
}

export function inviteMailtoHref(email: string, url: string) {
  return `mailto:${email}?subject=${encodeURIComponent(SUBJECT)}&body=${encodeURIComponent(inviteBody(url))}`;
}

export function inviteGmailHref(email: string, url: string) {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: email,
    su: SUBJECT,
    body: inviteBody(url),
  });
  return `https://mail.google.com/mail/?${params.toString()}`;
}
