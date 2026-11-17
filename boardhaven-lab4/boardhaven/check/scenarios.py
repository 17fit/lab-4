from playwright.sync_api import sync_playwright
import sys
base=(sys.argv[1] if len(sys.argv)>1 else 'http://localhost:8800/')
res=[]
def ok(name,cond,extra=''):
    res.append((name,bool(cond),extra)); print(('PASS ' if cond else 'FAIL ')+name, extra)
with sync_playwright() as p:
    b=p.chromium.launch()
    ctx=b.new_context(viewport={'width':1280,'height':800}); pg=ctx.new_page()
    errs=[]; pg.on('pageerror',lambda e: errs.append(str(e)))
    # catalog
    pg.goto(base+'games.html')
    ok('catalog total 6', pg.inner_text('#result-count').endswith('6'), pg.inner_text('#result-count'))
    pg.click('[data-filter="players-2"]'); pg.click('[data-filter="time-30"]')
    ok('2 players + <=30 -> 0 & empty shown', pg.inner_text('#result-count').endswith('0') and pg.is_visible('#empty'), pg.inner_text('#result-count'))
    pg.click('[data-filter="players-2"]'); pg.click('[data-filter="players-4"]')
    t=[x.inner_text() for x in pg.query_selector_all('#catalog li:not([hidden]) .card__title')]
    ok('4 players + <=30', sorted(t)==['Codenames','Dixit'], t)
    pg.fill('#search','cod')
    t=[x.inner_text() for x in pg.query_selector_all('#catalog li:not([hidden]) .card__title')]
    ok('search "cod" + filters', t==['Codenames'], t+[pg.inner_text('#result-count')])
    pg.click('[data-filter="players-4"]'); pg.click('[data-filter="time-30"]'); pg.fill('#search','')
    pg.select_option('#sort','name')
    t=[x.inner_text() for x in pg.query_selector_all('#catalog li .card__title')]
    ok('sort by name uk', t==sorted(t,key=lambda s:s), t)
    pg.select_option('#sort','time')
    t=[x.inner_text() for x in pg.query_selector_all('#catalog li .card__title')]
    ok('sort by time', t[0]=='Codenames' and t[-1]=='Catan', t)
    # burger on mobile
    m=b.new_context(viewport={'width':390,'height':800}).new_page()
    m.goto(base+'index.html')
    ok('burger exists', m.is_visible('.burger'))
    m.click('.burger'); ok('menu open aria', m.get_attribute('.burger','aria-expanded')=='true' and 'open' in m.get_attribute('.navbar__nav','class'))
    m.keyboard.press('Escape'); ok('escape closes', m.get_attribute('.burger','aria-expanded')=='false')
    m.click('.burger'); m.click('.navbar__nav a >> nth=0'); 
    # login validation
    pg.goto(base+'login.html')
    pg.click('button[type=submit]')
    e1=pg.inner_text('#err-email'); e2=pg.inner_text('#err-password')
    ok('login empty errors', e1=='Вкажіть електронну пошту' and e2=='Вкажіть пароль', [e1,e2])
    ok('focus first invalid', pg.evaluate('document.activeElement.id')=='email')
    pg.fill('#email','abc'); pg.fill('#password','123'); pg.click('button[type=submit]')
    ok('login format errors', pg.inner_text('#err-email').startswith('Некоректна') and pg.inner_text('#err-password').startswith('Пароль має'), [pg.inner_text('#err-email'),pg.inner_text('#err-password')])
    ok('aria-invalid + role alert', pg.get_attribute('#email','aria-invalid')=='true' and pg.get_attribute('#err-email','role')=='alert')
    pg.fill('#email','olena@example.com'); pg.fill('#password','secret1'); pg.click('button[type=submit]')
    ok('login success dialog', pg.is_visible('#modal-success'))
    ok('navbar shows Вийти', 'Вийти (olena)' in pg.inner_text('.navbar__login'), pg.inner_text('.navbar__login'))
    pg.goto(base+'index.html'); ok('auth persists', 'Вийти (olena)' in pg.inner_text('.navbar__login'))
    pg.click('.navbar__login'); ok('logout', pg.inner_text('.navbar__login')=='Увійти')
    # wizard
    pg.goto(base+'booking.html?game=catan')
    ok('guests limited 3-4', [o.inner_text() for o in pg.query_selector_all('#guests option')]==['3','4'])
    ok('dates 3 buttons', len(pg.query_selector_all('#dates .tag'))==3)
    pg.click('#to-2'); ok('step1 blocked w/o time', pg.is_visible('#hint-time') and pg.is_visible('[data-step="1"]'))
    pg.click('.slot[data-time="18:00"]'); pg.select_option('#guests','4'); pg.click('#to-2')
    dis=[x.get_attribute('disabled') is not None for x in pg.query_selector_all('#tables .slot')]
    ok('tables at 18:00 for 4: busy 2,4 + cap(1) disabled', dis==[True,True,False,True,False,False], dis)
    pg.click('#to-3'); ok('step2 blocked w/o table', pg.is_visible('#hint-table'))
    pg.click('#tables .slot >> nth=2'); pg.click('#to-3')
    ok('summary', 'Стіл 3' in pg.inner_text('#sum-table') and pg.inner_text('#sum-guests')=='4 гравці', [pg.inner_text('#sum-date'),pg.inner_text('#sum-table'),pg.inner_text('#sum-guests')])
    pg.click('#confirm-booking'); ok('empty name/phone errors', pg.inner_text('#err-b-name')!='' and pg.inner_text('#err-b-phone')!='', [pg.inner_text('#err-b-name'),pg.inner_text('#err-b-phone')])
    pg.fill('#b-name','Олена1'); pg.fill('#b-phone','12345'); pg.click('#confirm-booking')
    ok('bad name/phone', 'без цифр' in pg.inner_text('#err-b-name') and 'Формат' in pg.inner_text('#err-b-phone'))
    pg.fill('#b-name','Олена'); pg.fill('#b-phone','+380 (50) 123-45-67'); pg.click('#confirm-booking')
    ok('booking success', pg.is_visible('#modal-success'))
    saved=pg.evaluate("JSON.parse(localStorage.getItem('bh-bookings'))")
    ok('saved 1', len(saved)==1, saved)
    # duplicate attempt: close modal, click confirm again
    pg.evaluate("document.getElementById('modal-success').close()")
    ok('confirm button disabled after save', pg.is_disabled('#confirm-booking'))
    pg.evaluate("var b=document.getElementById('confirm-booking'); b.disabled=false; b.click()")
    saved=pg.evaluate("JSON.parse(localStorage.getItem('bh-bookings'))")
    ok('NO duplicate even if button forced', len(saved)==1, len(saved))
    # my bookings
    pg.goto(base+'my-bookings.html')
    rows=pg.query_selector_all('#bookings .row'); ok('my-bookings shows saved first', 'Catan' in rows[0].inner_text(), rows[0].inner_text().replace('\n',' | '))
    pg.click('#bookings .row:first-child [data-cancel]'); pg.click('#cancel-yes')
    ok('cancel -> cancelled badge', 'Скасовано' in pg.inner_text('#bookings .row:first-child') and pg.is_visible('#modal-success'))
    ok('status saved', pg.evaluate("JSON.parse(localStorage.getItem('bh-bookings'))[0].status")=='cancelled')
    pg.evaluate("document.getElementById('modal-success').close()")
    pg.click('#bookings .row:first-child [data-delete]')
    ok('delete removes + storage empty', pg.evaluate("JSON.parse(localStorage.getItem('bh-bookings')).length")==0)
    # soon
    pg.click('#bookings .row[data-soon="true"] [data-cancel]'); pg.click('#cancel-yes')
    ok('soon -> error modal', pg.is_visible('#modal-error'))
    # events
    pg.goto(base+'events.html')
    pg.click('[data-kind="tournament"]'); vis=[r.is_visible() for r in pg.query_selector_all('#events .row')]
    ok('events filter', any(vis) and not all(vis), vis)
    pg.click('[data-kind="all"]')
    pg.click('#events .row[data-full="false"] [data-event-btn]'); pg.click('#confirm-yes')
    ok('signup', pg.is_visible('#modal-success'))
    ok('btn Ви записані disabled', pg.inner_text('#events .row[data-full="false"] [data-event-btn]')=='Ви записані' and pg.is_disabled('#events .row[data-full="false"] [data-event-btn]'))
    pg.evaluate("document.getElementById('modal-success').close()")
    if pg.query_selector('#events .row[data-full="true"] [data-event-btn]'):
        pg.click('#events .row[data-full="true"] [data-event-btn]'); ok('waitlist title', 'очікування' in pg.inner_text('#mc-title'), pg.inner_text('#mc-title'))
    ok('no page errors', not errs, errs)
    b.close()
print(sum(1 for r in res if r[1]),'/',len(res))
