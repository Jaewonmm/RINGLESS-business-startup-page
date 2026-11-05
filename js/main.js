/* ============ CONFIG ============ */
// Point this at your form backend (Formspree, Buttondown, Google Apps Script, etc.).
// It receives JSON: {email, source, medium, campaign, ts, kind}
// Leave empty to only store signups in this browser (local testing).
const ENDPOINT = "";
const SHARE_URL = location.origin && location.origin !== "null" ? location.origin + location.pathname : location.href;
/* ================================= */

document.getElementById("yr").textContent = new Date().getFullYear();

// Source tracking: ?utm_source=...  (tag friends/family as utm_source=friends)
const q = new URLSearchParams(location.search);
let ref = "direct"; try{ if(document.referrer) ref = new URL(document.referrer).hostname || "direct"; }catch{}
const src = { source: q.get("utm_source") || q.get("ref") || ref, medium: q.get("utm_medium") || "", campaign: q.get("utm_campaign") || "" };

async function send(payload){
  const rec = {...payload, ...src, ts: new Date().toISOString()};
  const log = JSON.parse(localStorage.getItem("ringless_log") || "[]");
  log.push(rec); localStorage.setItem("ringless_log", JSON.stringify(log));
  if(!ENDPOINT) return true;
  const r = await fetch(ENDPOINT, {method:"POST", headers:{"Content-Type":"application/json","Accept":"application/json"}, body:JSON.stringify(rec)});
  return r.ok;
}

const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
let signedEmail = null;

document.querySelectorAll("form.signup").forEach(form => {
  form.addEventListener("submit", async e => {
    e.preventDefault();
    const err = form.parentElement.querySelector(".err");
    const btn = form.querySelector("button");
    const email = form.email.value.trim();
    err.textContent = "";
    if(form.company.value) return;                       // honeypot
    if(!emailRe.test(email)){ err.textContent = "Please enter a valid email address."; return; }
    btn.disabled = true;
    try{
      if(!(await send({kind:"signup", email}))) throw 0;
      signedEmail = email;
      showThanks(form);
    }catch{
      err.textContent = "Something went wrong. Please try again.";
      btn.disabled = false;
    }
  });
});

function showThanks(from){
  document.querySelectorAll("form.signup, .err, .note").forEach(el => el.style.display = "none");
  document.querySelectorAll("[data-thanks]").forEach(box => {
    box.style.display = "block";
    box.innerHTML = `
      <h3>You're on the list.</h3>
      <p>We'll email you once, when RINGLESS is ready. Know someone who ruins tables? Send them this link.</p>
      <div class="share"><input readonly value="${SHARE_URL}" aria-label="Share link"><button class="btn" type="button" data-copy>Copy</button></div>
      <fieldset class="survey" style="border:0">
        <legend>One question: what would you pay for a set of four?</legend>
        ${["Under $25","$25 to $40","$40 to $60","$60 to $80","Over $80"].map(v=>`<label><input type="radio" name="price" value="${v}">${v}</label>`).join("")}
        <p data-survey-note style="font-size:.8rem;margin-top:6px"></p>
      </fieldset>`;
  });
  from.closest("section").scrollIntoView({behavior:"smooth", block:"center"});
}

document.addEventListener("click", e => {
  const b = e.target.closest("[data-copy]");
  if(!b) return;
  navigator.clipboard?.writeText(SHARE_URL);
  b.textContent = "Copied"; setTimeout(()=>b.textContent="Copy", 1600);
});
document.addEventListener("change", async e => {
  if(e.target.name !== "price") return;
  await send({kind:"survey", email:signedEmail, price_range:e.target.value}).catch(()=>{});
  document.querySelectorAll("[data-survey-note]").forEach(n => n.textContent = "Thanks. That helps.");
  document.querySelectorAll('input[name="price"]').forEach(i => i.checked = i.value === e.target.value);
});

if("IntersectionObserver" in window){
  const io = new IntersectionObserver(es => es.forEach(x => { if(x.isIntersecting){ x.target.classList.add("in"); io.unobserve(x.target); }}), {threshold:.12});
  document.querySelectorAll(".reveal").forEach(el => io.observe(el));
} else document.querySelectorAll(".reveal").forEach(el => el.classList.add("in"));
