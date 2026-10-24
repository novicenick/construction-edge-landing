const toggle = document.querySelector('.menu-toggle');
const nav = document.querySelector('#navigation');
function closeMenu() { toggle.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); }
toggle.addEventListener('click', () => { const open = toggle.getAttribute('aria-expanded') !== 'true'; toggle.setAttribute('aria-expanded', String(open)); nav.classList.toggle('open', open); });
nav.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
document.addEventListener('keydown', event => { if (event.key === 'Escape' && nav.classList.contains('open')) { closeMenu(); toggle.focus(); } });
const form = document.querySelector('#contact-form');
if (form) {
  const button = form.querySelector('button[type="submit"]');
  const status = form.querySelector('.form-status');
  const label = button.innerHTML;
  let submitting = false;
  function resetSubmission() {
    submitting = false;
    button.disabled = false;
    button.innerHTML = label;
    status.textContent = '';
    form.removeAttribute('aria-busy');
  }
  form.addEventListener('submit', event => {
    if (submitting || !form.reportValidity()) { event.preventDefault(); return; }
    submitting = true;
    button.disabled = true;
    button.textContent = 'Sending…';
    form.setAttribute('aria-busy', 'true');
    status.textContent = 'Opening Formspree to complete your enquiry. Please wait for confirmation.';
    // Let the browser POST normally so Formspree can handle any verification.
    // Restore the control if navigation fails; never resubmit automatically.
    window.setTimeout(resetSubmission, 20000);
  });
  window.addEventListener('pageshow', resetSubmission);
}
