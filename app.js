// 🔹 CONFIGURAR SUPABASE
const supabaseUrl = "https://kgwjjngjljmjewhlimex.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imtnd2pqbmdqbGptamV3aGxpbWV4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzc1Njk4NTksImV4cCI6MjA5MzE0NTg1OX0.Qkxzddp4WG_pgbVaR24YvF9lVnejHLCDFGolGmyGvVQ";
const supabaseClient = supabase.createClient(supabaseUrl, supabaseKey);

const MI_NUMERO = "543735549919";

let carrito = JSON.parse(localStorage.getItem("carrito")) || [];

// ================= PRODUCTOS =================
async function cargarProductos(){

  let { data } = await supabaseClient
    .from("productos")
    .select("*")
    .eq("activo", true);

  let contenedor = document.getElementById("productos");
  contenedor.innerHTML = "";

  data.forEach(p => {

    let selectorPantallas = "";
    let precioHTML = "";

    // 🔥 CUENTA COMPLETA
    if(p.tipo === "completa"){

      selectorPantallas = `
        <p style="
          background:#10b981;
          padding:8px;
          border-radius:8px;
          text-align:center;
          font-size:13px;
          margin-top:8px;
        ">
          ✔ Cuenta completa
        </p>
      `;

      // ❌ NO mostrar / pantalla
      precioHTML = `
        <h3>$${p.precio}</h3>
      `;
    }

    // 🔥 POR PANTALLAS
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

      precioHTML = `
        <h3>$${p.precio} / pantalla</h3>
      `;
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
            Agregar
          </button>
        </div>
      </div>
    `;
  });
}

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

// ================= MODAL =================
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

// ================= TICKET =================
function generarTicket(){
  return "T" + Math.floor(Math.random()*100000);
}

// ================= PEDIDO =================
async function confirmarPedido(){

  let nombre = document.getElementById("nombre").value;
  let apellido = document.getElementById("apellido").value;
  let whatsapp = document.getElementById("whatsapp").value;

  if(!nombre || !apellido || !whatsapp || carrito.length === 0){
    alert("Completa todo");
    return;
  }

  let ticket = generarTicket();

  let total = carrito.reduce((acc,p)=>
    acc + Number(p.precio) * (p.pantallas || 1)
  ,0);

  let { data: pedido } = await supabaseClient
    .from("pedidos")
    .insert([{
      ticket,
      nombre,
      apellido,
      whatsapp,
      total
    }])
    .select();

  let pedido_id = pedido[0].id;

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

  let mensaje = `Hola acabo de realizar un pedido\n\nTicket: ${ticket}\n\n`;

  carrito.forEach((p,i)=>{
    mensaje += `Pedido ${i+1}\n`;
    mensaje += `Producto: ${p.nombre}\n`;

    if(p.tipo === "completa"){
      mensaje += `Cuenta completa\n`;
    } else {
      mensaje += `Pantallas: ${p.pantallas}\n`;
    }

    mensaje += `Precio: $${p.precio * (p.pantallas || 1)}\n\n`;
    mensaje += `----------------------\n\n`;
  });

  mensaje += `Total: $${total}`;

  let url = `https://wa.me/${MI_NUMERO}?text=${encodeURIComponent(mensaje)}`;
  window.open(url, "_blank");

  carrito = [];
  localStorage.removeItem("carrito");

  renderCarrito();
  toggleCarrito();

  alert("Pedido enviado");
}

// INIT
cargarProductos();
renderCarrito();