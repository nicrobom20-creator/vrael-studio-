// Анимации появления при скролле
const io=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target)}}),{threshold:.12,rootMargin:'0px 0px -40px 0px'});
document.querySelectorAll('.reveal').forEach((el,i)=>{el.style.transitionDelay=(i%4)*80+'ms';io.observe(el)});
// Шапка при скролле
const nav=document.getElementById('nav');
const onScroll=()=>nav.classList.toggle('scrolled',scrollY>20);addEventListener('scroll',onScroll,{passive:true});onScroll();
// 3D-наклон карточек (только для мыши)
if(matchMedia('(hover:hover)').matches){document.querySelectorAll('.tilt').forEach(c=>{c.addEventListener('mousemove',e=>{const r=c.getBoundingClientRect(),x=(e.clientX-r.left)/r.width-.5,y=(e.clientY-r.top)/r.height-.5;c.style.transform=`perspective(800px) rotateY(${x*8}deg) rotateX(${-y*8}deg) translateY(-6px)`});c.addEventListener('mouseleave',()=>c.style.transform='')})}
document.getElementById('year').textContent=new Date().getFullYear();
