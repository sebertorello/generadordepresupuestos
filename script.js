/* ---------- Navegación ---------- */
const ver=(id,s)=>document.getElementById(id).style.display=s;
const abrirFormularioBoda=()=>{ver('portada','none');ver('formularioBoda','block');};
const volverInicio=()=>{ver('formularioBoda','none');ver('portada','block');};


/* ---------- Utilidades ---------- */
const g=id=>{const t=document.getElementById(id).value.trim();return t===''?'a confirmar':t;};
const meses=['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
const fL=iso=>iso==='a confirmar'?iso:`${iso.split('-')[2]} de ${meses[+iso.split('-')[1]-1]} de ${iso.split('-')[0]}`;
const fS=iso=>iso==='a confirmar'?iso:iso.split('-').reverse().join('/');


/* ---------- Conversión mejorada números a letras (hasta 999 999 999) ---------- */
function numALetrasSimpl(n){
 const unidades=['','uno','dos','tres','cuatro','cinco','seis','siete','ocho','nueve'];
 const especiales=['diez','once','doce','trece','catorce','quince','dieciséis','diecisiete','dieciocho','diecinueve'];
 const decenas=['','','veinte','treinta','cuarenta','cincuenta','sesenta','setenta','ochenta','noventa'];
 const centenas=['','ciento','doscientos','trescientos','cuatrocientos','quinientos','seiscientos','setecientos','ochocientos','novecientos'];


 if(n===0) return 'cero';
 if(n===100) return 'cien';


 let texto='';


 // millones
 if(n>=1e6){
   const m=Math.floor(n/1e6);
   texto+= (m===1?'un millón ': numALetrasSimpl(m)+' millones ');
   n%=1e6;
 }


 // miles (tratado todo junto)
 if(n>=1000){
   const m=Math.floor(n/1000);
   if(m===1) texto+='mil ';
   else texto+= numALetrasSimpl(m)+' mil ';
   n%=1000;
 }


 // centenas
 if(n>=100){
   const c=Math.floor(n/100);
   texto+=centenas[c]+' ';
   n%=100;
 }


 // decenas y unidades
 if(n>=20){
   const d=Math.floor(n/10);
   texto+=decenas[d];
   if(n%10) texto+=' y '+unidades[n%10];
   return texto.trim();
 }
 if(n>=10){
   return (texto+especiales[n-10]).trim();
 }
 // unidades
 texto+=unidades[n];
 return texto.trim();
}


/* ---------- Imagen JPG → Base64 ---------- */
const to64=src=>new Promise(ok=>{
 const img=new Image(); img.crossOrigin='Anonymous';
 img.onload=()=>{
   const c=document.createElement('canvas');
   c.width=img.width; c.height=img.height;
   c.getContext('2d').drawImage(img,0,0);
   ok(c.toDataURL('image/jpeg',1));
 };
 img.src=src;
});


/* ---------- Escritura de texto con control de ajuste y negrita ---------- */
function writeWords(pdf,text,bold,maxW,state){
 pdf.setFont(bold?'Montserrat-Bold':'Montserrat-Light','normal');
 text.split(' ').forEach((palabra,i)=>{
   const chunk=(i>0?' ':'')+palabra;
   const w=pdf.getTextWidth(chunk);
   if(state.x + w > maxW){
     state.x = state.margin;
     state.y += state.lineH;
   }
   pdf.text(chunk, state.x, state.y);
   state.x += w;
 });
}


/* ---------- Generación del PDF completo ---------- */
async function generarPDF(){
 const pdf = new jsPDF('p','pt','a4');
 const margin = 15;
 const W = pdf.internal.pageSize.getWidth();
 const maxW = W - margin;
 let state = { x:margin, y:100, margin, lineH:18 };


 pdf.setFontSize(14);


 // Datos del formulario
 const nom = g('nombreNovios'),
       fB  = fL(g('fechaBoda')),
       sal = g('salon'),
       ciu = g('ciudad'),
       prRaw = g('precio'),
       prNum = prRaw==='a confirmar'?0:parseInt(prRaw),
       prFmt = new Intl.NumberFormat('es-AR').format(prNum),
       prLet = prNum===0 ? 'a confirmar' : `${numALetrasSimpl(prNum)} pesos`,
       prTxt = prNum===0 ? '$a confirmar (a confirmar)' : `$${prFmt} (${prLet})`,
       fEm = fS(g('fechaEmision'));


 // Añadimos páginas con imágenes
 for(const imgPath of ['imagenes/Hoja1.jpg','imagenes/Hoja2.jpg','imagenes/Hoja3.jpg']){
   pdf.addImage(await to64(imgPath),'JPEG',0,0,W,pdf.internal.pageSize.getHeight());
   pdf.addPage();
 }
 // Hoja 4 con texto encima
 pdf.addImage(await to64('imagenes/Hoja4.jpg'),'JPEG',0,0,W,pdf.internal.pageSize.getHeight());


 // Bloques combinados
 const bloques = [
   { t:'El servicio de fotografía completo para la celebración de la boda de ', b:false },
   { t:nom+' ', b:true },
   { t:'a realizarse el día ', b:false },
   { t:fB+' ', b:true },
   { t:'en el salón ', b:false },
   { t:sal+' ', b:true },
   { t:'de la ciudad de ', b:false },
   { t:ciu+' ', b:true },
   { t:'tiene un costo de ', b:false },
   { t:prTxt+'. ', b:true },
   { t:'El mismo incluye una sesión de exteriores (pre o post boda) y la jornada del evento. La sesión de exteriores extra tiene un precio de $150.000. Para asegurar la reserva, se requiere un anticipo del 50%, a pagarse en los siguientes 15 días tras la emisión del presupuesto. El saldo restante se abonará el mes subsiguiente, brindando una gestión financiera cómoda para nuestros clientes. Nos esforzamos por ofrecer un servicio transparente y adaptado a sus necesidades. Es importante tener en cuenta que se aplicará un cargo adicional por viáticos solo en caso de que las sesiones exteriores se encuentren a más de 75 km de Río Cuarto. Estamos comprometidos a brindar un servicio completo y transparente, asegurando la satisfacción total de nuestros clientes.', b:false }
 ];


 bloques.forEach(b => writeWords(pdf, b.t, b.b, maxW, state));


 // Fecha de emisión
 state.x = margin;
 state.y += 2 * state.lineH;
 pdf.setFont('Montserrat-Bold','normal');
 pdf.text(`Río Cuarto, ${fEm}`, state.x, state.y);


 // Guardamos el archivo
 pdf.save(`${nom}.pdf`);
}


/* ---------- Envío por WhatsApp (pendiente) ---------- */
const enviarWhatsApp = ()=>alert('Aquí implementaremos WhatsApp');
