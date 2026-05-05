// 🔹 CONFIGURAR SUPABASE
const supabaseUrl = "https://kgwjjngjljmjewhlimex.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtnd2pqbmdqbGptamV3aGxpbWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1Njk4NTksImV4cCI6MjA5MzE0NTg1OX0.Qkxzddp4WG_pgbVaR24YvF9lVnejHLCDFGolGmyGvVQ";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const MI_NUMERO = "543735549919";

let carrito = JSON.parse(localStorage.getItem("carrito")) || [];
let productosGlobal = [];

// ================= PRODUCTOS =================
async function cargarProductos(){

  let { data } = await supabaseClient
    .from("productos")
    .select("*")
    .eq("activo", true);

  productosGlobal = data;

  renderProductos(data);
}

function renderProductos(data){

  let contenedor = document.getElementById("productos");
  contenedor.innerHTML = "";

  data.forEach(p => {

    let selectorPantallas = "";
    let precioHTML = "";

    if(p.tipo === "completa"){

      selectorPantallas = `<p class="badge">✔ Cuenta completa</p>`;

      precioHTML = `<h3>$${p.precio}</h3>`;
    }
    else {

      let opciones = "";
      let max = p.max_pantallas || 1;

      for(let i=1;i<=max;i++){
        opciones += `<option value="${i}">${i}</option>`;
      }

      selectorPantallas = `
        <label>Pantallas:</label>
        <select id="pantallas-${p.id}">
          ${opciones}
        </select>
      `;

      precioHTML = `<h3>$${p.precio} / pantalla</h3>`;
    }

    contenedor.innerHTML += `
      <div class="card">
        <img src="${p.imagen_url || 'https://via.placeholder.com/300'}">

        <div class="card-body">
          <h4>${p.nombre}</h4>
          <p>${p.descripcion || ''}</p>

          ${precioHTML}
          ${selectorPantallas}

          <button class="btn" onclick='agregarCarritoConPantalla(${JSON.stringify(p)})'>
            Comprar ahora
          </button>
        </div>
      </div>
    `;
  });
}

// ================= BUSCADOR =================
document.addEventListener("input", (e)=>{
  if(e.target.id === "buscadorInput"){
    let texto = e.target.value.toLowerCase();

    let filtrados = productosGlobal.filter(p =>
      p.nombre.toLowerCase().includes(texto)
    );

    renderProductos(filtrados);
  }
});

// ================= CARRITO =================
function agregarCarritoConPantalla(producto){

  let pantallas = 1;

  if(producto.tipo !== "completa"){
    let select = document.getElementById(`pantallas-${producto.id}`);
    pantallas = Number(select.value);
  }

  let productoFinal = {
    ...producto,
    pantallas,
    precio_total: producto.precio * pantallas
  };

  carrito.push(productoFinal);

  localStorage.setItem("carrito", JSON.stringify(carrito));

  renderCarrito();
  mostrarToast();
}

function eliminar(i){
  carrito.splice(i,1);
  localStorage.setItem("carrito", JSON.stringify(carrito));
  renderCarrito();
}

function renderCarrito(){

  let lista = document.getElementById("listaCarrito");
  let total = 0;

  lista.innerHTML = "";

  carrito.forEach((p,i)=>{

    let precio = Number(p.precio);
    let pantallas = p.pantallas || 1;
    let subtotal = precio * pantallas;

    total += subtotal;

    lista.innerHTML += `
      <div class="item-carrito">
        <div>
          <strong>${p.nombre}</strong><br>
          $${precio} x ${pantallas} = <b>$${subtotal}</b>
        </div>
        <button onclick="eliminar(${i})">✕</button>
      </div>
    `;
  });

  document.getElementById("total").innerHTML =
    `Total: <strong>$${total}</strong>`;

  document.getElementById("contador").innerText = carrito.length;
}

// ✅ ESTA ES LA QUE FALTABA
function toggleCarrito(){
  let modal = document.getElementById("modalCarrito");
  modal.style.display = modal.style.display === "block" ? "none" : "block";
}

// ================= TOAST =================
function mostrarToast(){
  let t = document.getElementById("toast");
  t.style.display = "block";
  setTimeout(()=> t.style.display = "none", 1500);
}

// ================= PEDIDO =================
function generarTicket(){
  return "T" + Math.floor(Math.random()*100000);
}

async function confirmarPedido(){

  let nombre = document.getElementById("nombre").value.trim();
  let apellido = document.getElementById("apellido").value.trim();
  let whatsapp = document.getElementById("whatsapp").value.trim();
  let email = document.getElementById("email").value.trim();

  if(!nombre || !apellido || !whatsapp || carrito.length === 0){
    alert("⚠️ Completa todos los datos");
    return;
  }

  try {

    let ticket = generarTicket();

    let totalGeneral = carrito.reduce((acc,p)=>
      acc + Number(p.precio) * (p.pantallas || 1)
    ,0);

    // ================= GUARDAR PEDIDO =================
    let { data: pedido, error } = await supabaseClient
      .from("pedidos")
      .insert([{
        ticket,
        nombre,
        apellido,
        whatsapp,
        email,
        total: totalGeneral,
        estado: "pendiente"
      }])
      .select();

    if(error){
      console.error(error);
      alert("Error al guardar pedido");
      return;
    }

    let pedido_id = pedido[0].id;

    // ================= GUARDAR ITEMS =================
    for(let p of carrito){
      await supabaseClient.from("pedido_items").insert([{
        pedido_id,
        producto_id: p.id,
        nombre_producto: p.nombre,
        precio: p.precio,
        cantidad: p.pantallas || 1,
        duracion: "1 mes"
      }]);
    }

    // ================= MENSAJE WHATSAPP =================
    let mensaje = `🧾 *NUEVO PEDIDO*\n\n`;
    mensaje += `🎟 Ticket: ${ticket}\n\n`;

    carrito.forEach((p,i)=>{

      let cantidad = p.pantallas || 1;
      let subtotal = p.precio * cantidad;

      mensaje += `📦 Pedido ${i+1}\n`;
      mensaje += `Servicio: ${p.nombre}\n`;

      if(p.tipo === "completa"){
        mensaje += `Cantidad: ${cantidad} cuenta(s) completa(s)\n`;
      } else {
        mensaje += `Cantidad: ${cantidad} pantalla(s)\n`;
      }

      mensaje += `Precio unitario: $${p.precio}\n`;
      mensaje += `Total: $${subtotal}\n\n`;
    });

    mensaje += `💰 *TOTAL GENERAL: $${totalGeneral}*`;

    let url = `https://wa.me/${MI_NUMERO}?text=${encodeURIComponent(mensaje)}`;
    window.open(url, "_blank");

    // ================= LIMPIEZA =================
    carrito = [];
    localStorage.removeItem("carrito");

    renderCarrito();
    toggleCarrito();

    alert("✅ Pedido enviado correctamente");

  } catch(err){
    console.error(err);
    alert("Error inesperado");
  }
}

// ================= FAKE ACTIVIDAD =================

// NOMBRES
const nombresFake = [
  "Juan","Carlos","Pedro","Luis","Miguel","Javier","Diego","Matias","Lucas","Nicolas","Andres","Federico","Gonzalo","Santiago","Martin","Leonardo","Facundo","Pablo","Gabriel","Tomas",
  "Bruno","Ignacio","Marcos","Joaquin","Rafael","Hector","Oscar","Alberto","Ricardo","Daniel","Victor","Emiliano","Agustin","Benjamin","Nahuel","Ezequiel","Sebastian","Cristian","Alan","Thiago",
  "Maria","Sofia","Lucia","Valentina","Camila","Martina","Florencia","Julieta","Victoria","Antonella","Daniela","Carolina","Paula","Fernanda","Micaela","Agustina","Valeria","Noelia","Romina",
  "Kevin","Brian","Dylan","Ian","Axel","Enzo","Aaron","Liam","Gael","Mateo","Leo","Alex","Noah","Adrian","Samuel","Dante",
  "Jose","Manuel","Raul","Esteban","Hugo","Felipe","Ramon","Cesar","Eduardo","Sergio","Mario","Roberto","Antonio"
];

// APELLIDOS
const apellidosFake = [
  "Gomez","Rodriguez","Perez","Lopez","Gonzalez","Martinez","Sanchez","Romero","Fernandez","Diaz",
  "Ruiz","Torres","Flores","Acosta","Vargas","Castro","Silva","Morales","Rojas","Ortiz",
  "Herrera","Medina","Molina","Castillo","Ramos","Nunez","Vega","Cabrera","Reyes","Mendez"
];

// ACCIONES
const accionesFake = [
  "compró Netflix",
  "adquirió Disney+",
  "compró cuenta Premium",
  "activó un servicio",
  "realizó un pedido",
  "compró IPTV",
  "renovó su cuenta"
];

// CIUDADES
const ciudadesFake = [
  "Buenos Aires",
  "Córdoba",
  "Rosario",
  "Mendoza",
  "Salta",
  "La Plata",
  "Tucumán"
];

// evitar repetición inmediata
let ultimoNombreCompleto = "";

function random(arr){
  return arr[Math.floor(Math.random() * arr.length)];
}

// ================= LOOP =================
setInterval(()=>{

  let div = document.getElementById("actividad");
  if(!div) return;

  let nombre = random(nombresFake);
  let apellido = random(apellidosFake);

  let nombreCompleto = `${nombre} ${apellido}`;

  // evitar repetidos seguidos
  if(nombreCompleto === ultimoNombreCompleto){
    nombre = random(nombresFake);
    apellido = random(apellidosFake);
    nombreCompleto = `${nombre} ${apellido}`;
  }

  ultimoNombreCompleto = nombreCompleto;

  let accion = random(accionesFake);
  let ciudad = random(ciudadesFake);

  div.innerText = `🔥 ${nombreCompleto} de ${ciudad} ${accion} hace unos segundos`;
  div.style.opacity = 1;

  setTimeout(()=>{
    div.style.opacity = 0;
  }, 3500);

}, 5000);

// ================= INIT =================
cargarProductos();
renderCarrito();