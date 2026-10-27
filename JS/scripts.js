const STORAGE = { orders: "wcOrders", activeOrder: "wcActiveOrder", admin: "wcAdminLoggedIn", stock: "wcProductStock", stockVersion: "wcProductStockVersion", accounts: "wcAccounts", userSession: "wcUserSession", carts: "wcUserCarts", notifications: "wcUserNotifications" };
const money = new Intl.NumberFormat("es-CL", { style: "currency", currency: "CLP", maximumFractionDigits: 0 });
const catalogProducts = [
	{ id: "caja", name: "Caja de recuerdos", image: "Image/Cofre.avif", description: "Caja de madera con tapa grabada a elección.", price: 1800, stock: 10, tag: "MÁS PEDIDA" },
	{ id: "llavero", name: "Llavero grabado", image: "Image/Llaveros.avif", description: "Madera sellada con iniciales o una palabra especial.", price: 600, stock: 30, tag: "PERSONALIZABLE" },
	{ id: "portavasos-hoja", name: "Portavasos de oja", image: "Image/Porta vasos de oja.avif", description: "Portavasos decorativo de madera con forma de hoja.", price: 1200, stock: 4, tag: "HECHO A MANO" },
	{ id: "mariquitas", name: "Adorno de mariquitas (paquete de 6 unidades)", image: "Image/Mariquitas.avif", description: "Oferta: $500 por paquete de 6 unidades.", price: 500, stock: 100, tag: "HECHO A MANO" }
];

async function hashPassword(password, salt) {
	const keyMaterial = await crypto.subtle.importKey("raw", new TextEncoder().encode(password), "PBKDF2", false, ["deriveBits"]);
	const hash = await crypto.subtle.deriveBits(
		{ name: "PBKDF2", salt, iterations: 210000, hash: "SHA-256" },
		keyMaterial,
		256
	);
	return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function toHex(bytes) {
	return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function fromHex(value) {
	return new Uint8Array(value.match(/.{2}/g).map((byte) => Number.parseInt(byte, 16)));
}

function readStored(key, fallback) {
	try {
		const value = localStorage.getItem(key);
		return value ? JSON.parse(value) : fallback;
	} catch {
		return fallback;
	}
}

function saveStored(key, value) {
	localStorage.setItem(key, JSON.stringify(value));
}

function getStoredByEmail(key, email) {
	const stored = readStored(key, {});
	return stored && typeof stored === "object" && !Array.isArray(stored)
		? stored[email]
		: undefined;
}

function saveUserNotification(email, notification) {
	const stored = readStored(STORAGE.notifications, {});
	const notifications = stored && typeof stored === "object" && !Array.isArray(stored)
		? stored
		: {};
	const inbox = Array.isArray(notifications[email]) ? notifications[email] : [];
	inbox.unshift({ ...notification, date: new Date().toISOString() });
	notifications[email] = inbox;
	saveStored(STORAGE.notifications, notifications);
}

const menuButton = document.querySelector(".menu-toggle");
const siteNavigation = document.querySelector(".site-nav");
let updateNotifications = () => {};

if (siteNavigation) {
	const navigationItems = [...siteNavigation.children];
	const navigationLinks = document.createElement("div");
	navigationLinks.className = "site-nav-links";
	navigationLinks.setAttribute("aria-label", "Páginas");
	navigationLinks.append(...navigationItems);

	const searchForm = document.createElement("form");
	searchForm.className = "site-nav-search";
	searchForm.setAttribute("role", "search");
	const searchInput = document.createElement("input");
	searchInput.type = "search";
	searchInput.className = "site-nav-search-input";
	searchInput.placeholder = "Buscar productos o páginas";
	searchInput.setAttribute("aria-label", "Buscar productos o páginas");
	searchInput.setAttribute("role", "combobox");
	searchInput.setAttribute("aria-autocomplete", "list");
	searchInput.setAttribute("aria-expanded", "false");
	const searchButton = document.createElement("button");
	searchButton.type = "submit";
	searchButton.className = "site-nav-search-button";
	searchButton.textContent = "Buscar";
	const notificationsToggle = document.createElement("button");
	notificationsToggle.type = "button";
	notificationsToggle.className = "site-nav-notifications-toggle";
	notificationsToggle.setAttribute("aria-label", "Ver notificaciones");
	notificationsToggle.setAttribute("aria-expanded", "false");
	notificationsToggle.setAttribute("aria-controls", "site-nav-notifications");
	notificationsToggle.hidden = true;
	const notificationBell = document.createElementNS("http://www.w3.org/2000/svg", "svg");
	notificationBell.setAttribute("viewBox", "0 0 24 24");
	notificationBell.setAttribute("aria-hidden", "true");
	notificationBell.classList.add("account-menu-bell");
	const bellShape = document.createElementNS("http://www.w3.org/2000/svg", "path");
	bellShape.setAttribute("d", "M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4");
	notificationBell.append(bellShape);
	const notificationBadge = document.createElement("span");
	notificationBadge.className = "account-menu-notification-count";
	notificationBadge.setAttribute("aria-hidden", "true");
	notificationsToggle.append(notificationBell, notificationBadge);
	const suggestions = document.createElement("div");
	suggestions.className = "site-nav-search-suggestions";
	suggestions.id = "site-nav-search-suggestions";
	suggestions.setAttribute("role", "listbox");
	suggestions.setAttribute("aria-label", "Productos sugeridos");
	suggestions.hidden = true;
	searchInput.setAttribute("aria-controls", suggestions.id);
	const notificationsPanel = document.createElement("section");
	notificationsPanel.id = "site-nav-notifications";
	notificationsPanel.className = "site-nav-notifications";
	notificationsPanel.setAttribute("aria-label", "Notificaciones");
	notificationsPanel.hidden = true;
	const notificationHeading = document.createElement("h2");
	notificationHeading.textContent = "Notificaciones";
	const notificationList = document.createElement("ul");
	notificationList.className = "account-menu-notifications";
	const emptyNotifications = document.createElement("p");
	emptyNotifications.className = "account-menu-empty-inbox";
	emptyNotifications.textContent = "No tienes notificaciones.";
	notificationsPanel.append(notificationHeading, notificationList, emptyNotifications);
	searchForm.append(searchInput, searchButton, notificationsToggle, suggestions, notificationsPanel);
	notificationsToggle.addEventListener("click", () => {
		const isExpanded = notificationsToggle.getAttribute("aria-expanded") === "true";
		notificationsPanel.hidden = isExpanded;
		notificationsToggle.setAttribute("aria-expanded", String(!isExpanded));
		suggestions.hidden = true;
		searchInput.setAttribute("aria-expanded", "false");
	});
	const searchFeedback = document.createElement("p");
	searchFeedback.className = "site-nav-search-feedback";
	searchFeedback.setAttribute("role", "status");
	searchFeedback.setAttribute("aria-live", "polite");
	searchFeedback.hidden = true;

	siteNavigation.append(searchForm, navigationLinks, searchFeedback);
	const searchableItems = [...navigationLinks.children];
	let matchingProducts = [];
	updateNotifications = () => {
		const account = getSignedInAccount();
		const isAdmin = localStorage.getItem(STORAGE.admin) === "true";
		const notifications = account ? getStoredByEmail(STORAGE.notifications, account.email) : [];
		const inbox = Array.isArray(notifications)
			? notifications.filter((notification) => notification && typeof notification.message === "string")
			: [];
		notificationList.replaceChildren();
		for (const notification of inbox) {
			const item = document.createElement("li");
			const title = document.createElement("strong");
			title.textContent = notification.title || "Notificación";
			const message = document.createElement("p");
			message.textContent = notification.message;
			item.append(title, message);
			notificationList.append(item);
		}
		emptyNotifications.hidden = inbox.length > 0;
		notificationsToggle.hidden = !account || isAdmin;
		notificationBadge.textContent = inbox.length > 99 ? "99+" : String(inbox.length);
		notificationBadge.hidden = inbox.length === 0;
		notificationsToggle.setAttribute(
			"aria-label",
			inbox.length > 0 ? `Ver notificaciones (${inbox.length})` : "Ver notificaciones"
		);
		if (notificationsToggle.hidden) {
			notificationsPanel.hidden = true;
			notificationsToggle.setAttribute("aria-expanded", "false");
		}
	};
	notificationsToggle.addEventListener("click", updateNotifications);
	window.addEventListener("storage", updateNotifications);
	window.addEventListener("pageshow", updateNotifications);
	updateNotifications();

	function normalizeSearch(value) {
		return value.trim().toLocaleLowerCase("es").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
	}

	function matchInputCase(name) {
		const normalizedName = name.toLocaleLowerCase("es");
		return normalizedName.charAt(0).toLocaleUpperCase("es") + normalizedName.slice(1);
	}

	function renderSuggestions(query) {
		const normalizedQuery = normalizeSearch(query);
		matchingProducts = catalogProducts.filter((product) => normalizeSearch(product.name).includes(normalizedQuery));
		suggestions.replaceChildren();
		const heading = document.createElement("p");
		heading.className = "site-nav-search-heading";
		heading.textContent = normalizedQuery ? "Productos" : "Búsquedas sugeridas";
		suggestions.append(heading);

		if (!matchingProducts.length) {
			const emptyMessage = document.createElement("p");
			emptyMessage.className = "site-nav-search-empty";
			emptyMessage.textContent = "No encontramos productos.";
			suggestions.append(emptyMessage);
		} else {
			for (const product of matchingProducts) {
				const option = document.createElement("button");
				option.type = "button";
				option.className = "site-nav-search-option";
				option.setAttribute("role", "option");
				option.textContent = `${matchInputCase(product.name)} · ${money.format(product.price)}`;
				option.addEventListener("pointerdown", (event) => event.preventDefault());
				option.addEventListener("click", () => {
					window.location.href = `servicios.html#producto-${encodeURIComponent(product.id)}`;
				});
				suggestions.append(option);
			}
		}
		suggestions.hidden = false;
		searchInput.setAttribute("aria-expanded", "true");
	}

	function filterNavigation(query) {
		const normalizedQuery = normalizeSearch(query);
		let visibleCount = 0;
		for (const item of searchableItems) {
			const label = normalizeSearch(item.textContent);
			item.hidden = Boolean(normalizedQuery) && !label.includes(normalizedQuery);
			if (!item.hidden) visibleCount += 1;
		}
		searchFeedback.textContent = normalizedQuery && visibleCount === 0 && matchingProducts.length === 0 ? "No se encontraron páginas ni productos." : "";
		searchFeedback.hidden = !searchFeedback.textContent;
	}
	searchInput.addEventListener("focus", () => renderSuggestions(searchInput.value));
	searchInput.addEventListener("input", () => {
		renderSuggestions(searchInput.value);
		filterNavigation(searchInput.value);
	});
	document.addEventListener("click", (event) => {
		if (!searchForm.contains(event.target)) {
			suggestions.hidden = true;
			searchInput.setAttribute("aria-expanded", "false");
			notificationsPanel.hidden = true;
			notificationsToggle.setAttribute("aria-expanded", "false");
		}
	});
	searchInput.addEventListener("keydown", (event) => {
		if (event.key === "Escape") {
			suggestions.hidden = true;
			searchInput.setAttribute("aria-expanded", "false");
			notificationsPanel.hidden = true;
			notificationsToggle.setAttribute("aria-expanded", "false");
		}
		if (event.key === "ArrowDown" && !suggestions.hidden) {
			event.preventDefault();
			suggestions.querySelector(".site-nav-search-option")?.focus();
		}
	});
	searchForm.addEventListener("submit", (event) => {
		event.preventDefault();
		renderSuggestions(searchInput.value);
		filterNavigation(searchInput.value);
		if (!searchInput.value.trim()) return;
		if (matchingProducts.length) {
			window.location.href = `servicios.html#producto-${encodeURIComponent(matchingProducts[0].id)}`;
			return;
		}
		const firstMatch = searchableItems.find((item) => !item.hidden);
		const link = firstMatch?.matches("a") ? firstMatch : firstMatch?.querySelector("a");
		if (link) window.location.href = link.href;
	});
}

if (menuButton && siteNavigation) {
	menuButton.addEventListener("click", () => {
		const isExpanded = menuButton.getAttribute("aria-expanded") === "true";
		menuButton.setAttribute("aria-expanded", String(!isExpanded));
		menuButton.setAttribute("aria-label", isExpanded ? "Abrir menú" : "Cerrar menú");
		siteNavigation.classList.toggle("is-open", !isExpanded);
	});
	siteNavigation.addEventListener("click", (event) => {
		if (event.target.closest("a")) {
			menuButton.setAttribute("aria-expanded", "false");
			menuButton.setAttribute("aria-label", "Abrir menú");
			siteNavigation.classList.remove("is-open");
		}
	});
	window.addEventListener("resize", () => {
		if (window.innerWidth > 680) {
			menuButton.setAttribute("aria-expanded", "false");
			menuButton.setAttribute("aria-label", "Abrir menú");
			siteNavigation.classList.remove("is-open");
		}
	});
}

const accountMenuToggle = document.querySelector("#account-menu-toggle");
const accountMenu = document.querySelector("#account-menu");

function getSignedInAccount() {
	const session = readStored(STORAGE.userSession, null);
	const accounts = readStored(STORAGE.accounts, []);
	return session && Array.isArray(accounts)
		? accounts.find((account) => account.email === session.email)
		: null;
}

function getAccountCart(account) {
	return account ? getStoredByEmail(STORAGE.carts, account.email) || {} : {};
}

function removeFromUserCart(account, productId, action) {
	if (!account || !catalogProducts.some((product) => product.id === productId)) return false;
	const storedCarts = readStored(STORAGE.carts, {});
	const carts = storedCarts && typeof storedCarts === "object" && !Array.isArray(storedCarts)
		? storedCarts
		: {};
	const userCart = carts[account.email] && typeof carts[account.email] === "object"
		? { ...carts[account.email] }
		: {};
	const quantity = userCart[productId];
	if (!Number.isInteger(quantity) || quantity < 1) return false;
	if (action === "remove-one" && quantity > 1) {
		userCart[productId] = quantity - 1;
	} else {
		delete userCart[productId];
	}
	carts[account.email] = userCart;
	saveStored(STORAGE.carts, carts);
	window.dispatchEvent(new Event("wc-cart-updated"));
	return true;
}

function updateAccountMenu() {
	if (!accountMenu) return;
	updateNotifications();
	const status = document.querySelector("#account-menu-status");
	const loginLink = document.querySelector("#account-menu-login");
	const logoutButton = document.querySelector("#account-menu-logout");
	const accountCart = document.querySelector("#account-menu-cart");
	const account = getSignedInAccount();
	const isAdmin = localStorage.getItem(STORAGE.admin) === "true";
	status.textContent = account || isAdmin ? "" : "No has iniciado sesión.";
	status.hidden = Boolean(account) || isAdmin;
	loginLink.hidden = isAdmin || Boolean(account);
	logoutButton.hidden = !isAdmin && !account;
	if (accountCart) {
		const userName = accountCart.querySelector("#account-menu-user");
		const itemsList = accountCart.querySelector("#account-menu-items");
		const emptyMessage = accountCart.querySelector("#account-menu-empty");
		const totalNode = accountCart.querySelector("#account-menu-total");
		let emailNode = accountCart.querySelector(".account-menu-email");
		if (!emailNode) {
			emailNode = document.createElement("p");
			emailNode.className = "account-menu-email";
		}
		userName.after(emailNode);
		const userCart = getAccountCart(account);
		const items = catalogProducts.filter((product) => Number.isInteger(userCart[product.id]) && userCart[product.id] > 0);
		let total = 0;
		userName.textContent = account?.username || account?.name || "USUARIO";
		emailNode.textContent = account?.email || "";
		itemsList.replaceChildren();
		for (const product of items) {
			const quantity = userCart[product.id];
			const item = document.createElement("li");
			item.className = "account-menu-cart-item";
			const itemName = document.createElement("span");
			itemName.textContent = `${product.name} × ${quantity}`;
			const itemActions = document.createElement("div");
			itemActions.className = "account-menu-cart-item-actions";
			const removeOne = document.createElement("button");
			removeOne.type = "button";
			removeOne.dataset.cartAction = "remove-one";
			removeOne.dataset.productId = product.id;
			removeOne.setAttribute("aria-label", `Quitar una unidad de ${product.name}`);
			removeOne.textContent = "− 1";
			const removeAll = document.createElement("button");
			removeAll.type = "button";
			removeAll.dataset.cartAction = "remove-all";
			removeAll.dataset.productId = product.id;
			removeAll.setAttribute("aria-label", `Quitar ${product.name} del carrito`);
			removeAll.textContent = "Quitar";
			itemActions.append(removeOne, removeAll);
			item.append(itemName, itemActions);
			itemsList.append(item);
			total += product.price * quantity * (quantity >= 3 ? 0.9 : 1);
		}
		emptyMessage.hidden = items.length > 0;
		totalNode.textContent = money.format(total);
		accountCart.hidden = !account || isAdmin;
	}
}

if (accountMenuToggle && accountMenu) {
	updateAccountMenu();
	const accountCart = document.querySelector("#account-menu-cart");
	accountCart.addEventListener("click", (event) => {
		const actionButton = event.target.closest("[data-cart-action]");
		if (!actionButton) return;
		const currentAccount = getSignedInAccount();
		if (!removeFromUserCart(currentAccount, actionButton.dataset.productId, actionButton.dataset.cartAction)) return;
		updateAccountMenu();
	});
	function closeAccountMenu() {
		accountMenu.hidden = true;
		accountMenuToggle.setAttribute("aria-expanded", "false");
	}

	accountMenuToggle.addEventListener("click", () => {
		const isExpanded = accountMenuToggle.getAttribute("aria-expanded") === "true";
		if (isExpanded) closeAccountMenu();
		else {
			accountMenu.hidden = false;
			accountMenuToggle.setAttribute("aria-expanded", "true");
		}
		updateAccountMenu();
	});
	document.addEventListener("click", (event) => {
		const eventPath = event.composedPath();
		if (!accountMenu.hidden && !eventPath.includes(accountMenu) && !accountMenuToggle.contains(event.target)) {
			closeAccountMenu();
		}
	});
	document.addEventListener("keydown", (event) => {
		if (event.key === "Escape" && !accountMenu.hidden) {
			closeAccountMenu();
			accountMenuToggle.focus();
		}
	});
	document.querySelector("#account-menu-logout").addEventListener("click", () => {
		if (localStorage.getItem(STORAGE.admin) === "true") {
			const adminLogout = document.querySelector("#admin-logout");
			if (adminLogout) adminLogout.click();
			else localStorage.removeItem(STORAGE.admin);
		}
		localStorage.removeItem(STORAGE.userSession);
		const accountLogout = document.querySelector("#account-session-logout");
		if (accountLogout) accountLogout.click();
		updateAccountMenu();
	});
	window.addEventListener("storage", updateAccountMenu);
	window.addEventListener("pageshow", updateAccountMenu);
}

if (document.body.dataset.page === "login") {
	const loginForm = document.querySelector("#login-form");
	const loginError = document.querySelector("#login-error");
	const accountCreateLink = document.querySelector("#account-create-link");
	const accountForm = document.querySelector("#account-form");
	const accountError = document.querySelector("#account-error");
	const accountFeedback = document.querySelector("#account-feedback");
	const accountSession = document.querySelector("#account-session");
	const successMessage = document.querySelector("#login-success");

	function showSession(message = "Sesión iniciada con éxito") {
		loginForm.hidden = true;
		accountCreateLink.hidden = true;
		accountForm.hidden = true;
		accountSession.hidden = true;
		successMessage.querySelector("h1").textContent = message;
		successMessage.hidden = false;
		document.body.classList.add("login-successful");
		window.setTimeout(() => window.location.replace("index.html"), 1600);
	}

	function showLoginForm() {
		loginForm.hidden = false;
		accountCreateLink.hidden = false;
		accountForm.hidden = true;
		accountSession.hidden = true;
		accountFeedback.textContent = "";
		accountError.textContent = "";
		loginError.textContent = "";
	}

	accountCreateLink.addEventListener("click", (event) => {
		event.preventDefault();
		loginForm.hidden = true;
		accountCreateLink.hidden = true;
		accountForm.hidden = false;
		accountFeedback.textContent = "";
		accountError.textContent = "";
	});

	document.querySelector("#account-login-link").addEventListener("click", (event) => {
		event.preventDefault();
		showLoginForm();
	});

	accountForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		accountError.textContent = "";
		accountFeedback.textContent = "";
		const fields = new FormData(accountForm);
		const name = String(fields.get("name") || "").trim();
		const accountUsername = String(fields.get("username") || "").trim();
		const normalizedUsername = accountUsername.toLowerCase();
		const email = String(fields.get("email") || "").trim().toLowerCase();
		const password = String(fields.get("password") || "");
		const confirmation = String(fields.get("password-confirm") || "");
		if (!name || !accountUsername || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			accountError.textContent = "Ingresa tu nombre, nombre de usuario y un correo electrónico válido.";
			return;
		}
		if (password.length < 8) {
			accountError.textContent = "La contraseña debe tener al menos 8 caracteres.";
			return;
		}
		if (password !== confirmation) {
			accountError.textContent = "Las contraseñas no coinciden.";
			return;
		}
		if (!crypto.subtle) {
			accountError.textContent = "No se puede proteger la contraseña en este navegador. Abre el sitio mediante HTTPS o localhost.";
			return;
		}
		const accounts = readStored(STORAGE.accounts, []);
		if (accounts.some((account) =>
			account.email === email ||
			account.username?.toLowerCase() === normalizedUsername ||
			account.email === normalizedUsername ||
			account.username?.toLowerCase() === email
		)) {
			accountError.textContent = "Ese correo o nombre de usuario ya está en uso.";
			return;
		}
		try {
			const salt = crypto.getRandomValues(new Uint8Array(16));
			const passwordHash = await hashPassword(password, salt);
			accounts.push({ name, username: accountUsername, email, salt: toHex(salt), passwordHash });
			saveStored(STORAGE.accounts, accounts);
			saveStored(STORAGE.userSession, { email });
			accountForm.reset();
			showSession("Cuenta creada con éxito");
		} catch (error) {
			accountError.textContent = "No se pudo guardar la cuenta. Inténtalo nuevamente.";
			console.error("No se pudo crear la cuenta.", error);
		}
	});

	loginForm.addEventListener("submit", async (event) => {
		event.preventDefault();
		const fields = new FormData(loginForm);
		const username = String(fields.get("username") || "").trim();
		const password = String(fields.get("password") || "");
		loginError.textContent = "";
		if (username === "admin" && password === "1234") {
			localStorage.setItem(STORAGE.admin, "true");
			localStorage.removeItem(STORAGE.userSession);
			showSession();
			return;
		}
		const accounts = readStored(STORAGE.accounts, []);
		const identifier = username.toLowerCase();
		const account = accounts.find((entry) =>
			entry.email === identifier || entry.username?.toLowerCase() === identifier
		);
		if (account) {
			if (!crypto.subtle) {
				loginError.textContent = "No se puede verificar la contraseña en este navegador. Abre el sitio mediante HTTPS o localhost.";
				return;
			}
			try {
				const passwordHash = await hashPassword(password, fromHex(account.salt));
				if (passwordHash === account.passwordHash) {
					saveStored(STORAGE.userSession, { email: account.email });
					showSession();
					return;
				}
			} catch (error) {
				loginError.textContent = "No se pudo completar el inicio de sesión. Inténtalo nuevamente.";
				console.error("No se pudo verificar la cuenta.", error);
				return;
			}
		}
		loginError.textContent = "Correo o contraseña incorrectos.";
	});

	document.querySelector("#account-session-logout").addEventListener("click", () => {
		localStorage.removeItem(STORAGE.userSession);
		localStorage.removeItem(STORAGE.admin);
		showLoginForm();
	});

	const adminSignedIn = localStorage.getItem(STORAGE.admin) === "true";
	const session = readStored(STORAGE.userSession, null);
	const accounts = readStored(STORAGE.accounts, []);
	const account = session && accounts.find((entry) => entry.email === session.email);
	if (adminSignedIn) {
		showSession();
	} else if (account) {
		showSession();
	}
}

if (document.body.dataset.page === "home") {
	const adminSignedIn = localStorage.getItem(STORAGE.admin) === "true";
	const activeOrder = readStored(STORAGE.activeOrder, null);
	const status = document.querySelector("#home-status");
	if (adminSignedIn) {
		status.textContent = "Bienvenido, Administrador";
		status.classList.add("status-admin");
	}
	if (activeOrder) {
		const alert = document.querySelector("#order-alert");
		alert.textContent = `Pedido activo guardado: ${activeOrder.itemSummary} · ${money.format(activeOrder.total)}.`;
		alert.hidden = false;
	}
}

if (document.body.dataset.page === "about") {
	const artisans = [
		{ name: "Nicolay Palma", image: "Image/Nicolay.jpg", role: "Dirección de Operaciones y Producción", description: "Coordina las operaciones del taller y la producción de cada pieza." },
		{ name: "Thomas Vera", image: "Image/Thomas.jpg", role: "Dirección Comercial y Marketing", description: "Lidera la estrategia comercial y la comunicación de la marca." },
		{ name: "Aleney González", image: "Image/Aleney.jpg", imagePosition: "center 50%", role: "Dirección de Finanzas y Administración", description: "Gestiona las finanzas y la administración del taller." }
	];
	const teamGrid = document.querySelector("#team-grid");
	for (const artisan of artisans) {
		const card = document.createElement("article");
		card.className = "team-card";
		const photo = document.createElement("img");
		photo.className = "team-photo";
		photo.src = artisan.image;
		photo.alt = artisan.name;
		if (artisan.imagePosition) photo.style.objectPosition = artisan.imagePosition;
		const info = document.createElement("div");
		info.className = "team-card-copy";
		const name = document.createElement("h3");
		name.textContent = artisan.name;
		const role = document.createElement("p");
		role.className = "team-role";
		role.textContent = artisan.role;
		const description = document.createElement("p");
		description.textContent = artisan.description;
		info.append(name, role, description);
		card.append(photo, info);
		teamGrid.append(card);
	}
}

if (document.body.dataset.page === "catalog") {
	const maxPerUser = 5;
	const products = catalogProducts.map((product) => ({ ...product }));
	const storedStock = readStored(STORAGE.stock, {});
	const stockVersion = 1;
	if (readStored(STORAGE.stockVersion, 0) < stockVersion) {
		saveStored(STORAGE.stock, Object.fromEntries(products.map((product) => [product.id, product.stock])));
		saveStored(STORAGE.stockVersion, stockVersion);
	} else {
		for (const product of products) product.stock = storedStock[product.id] ?? product.stock;
	}
	let account = getSignedInAccount();
	const cart = {};
	const grid = document.querySelector("#product-grid");
	const totalNode = document.querySelector("#cart-total");
	const itemsNode = document.querySelector("#cart-items");
	const saveButton = document.querySelector("#save-order");
	const feedback = document.querySelector("#cart-feedback");
	const catalogCount = document.querySelector("#catalog-count");
	catalogCount.textContent = `${products.length} productos disponibles`;

	function loadAccountCart(nextAccount) {
		account = nextAccount;
		const storedCart = getAccountCart(account);
		for (const product of products) {
			const quantity = storedCart[product.id];
			const remainingPurchaseLimit = getRemainingPurchaseLimit(account, product.id);
			cart[product.id] = Number.isInteger(quantity) && quantity > 0
				? Math.min(quantity, product.stock, remainingPurchaseLimit)
				: 0;
		}
	}

	function saveUserCart() {
		if (!account) return;
		const storedCarts = readStored(STORAGE.carts, {});
		const carts = storedCarts && typeof storedCarts === "object" && !Array.isArray(storedCarts)
			? storedCarts
			: {};
		carts[account.email] = { ...cart };
		saveStored(STORAGE.carts, carts);
	}

	function getPurchasedQuantity(signedInAccount, productId) {
		const orders = readStored(STORAGE.orders, []);
		if (!signedInAccount || !Array.isArray(orders)) return 0;
		return orders.reduce((quantity, order) => {
			if (order?.email !== signedInAccount.email || !Array.isArray(order.items)) return quantity;
			return quantity + order.items.reduce((orderQuantity, item) => {
				return item?.id === productId && Number.isInteger(item.quantity) && item.quantity > 0
					? orderQuantity + item.quantity
					: orderQuantity;
			}, 0);
		}, 0);
	}

	function getRemainingPurchaseLimit(signedInAccount, productId) {
		return Math.max(0, maxPerUser - getPurchasedQuantity(signedInAccount, productId));
	}

	if (account) {
		loadAccountCart(account);
		saveUserCart();
	}

	function updateCart() {
		let total = 0;
		const cartItems = [];
		for (const product of products) {
			const quantity = cart[product.id] || 0;
			if (!quantity) continue;
			const lineTotal = product.price * quantity * (quantity >= 3 ? 0.9 : 1);
			total += lineTotal;
			const item = document.createElement("div");
			item.className = "cart-summary-item";
			const itemName = document.createElement("span");
			itemName.textContent = `${product.name} × ${quantity}${quantity >= 3 ? " (10% desc.)" : ""}`;
			item.append(itemName);
			if (account) {
				const actions = document.createElement("div");
				actions.className = "account-menu-cart-item-actions";
				const removeOne = document.createElement("button");
				removeOne.type = "button";
				removeOne.dataset.cartAction = "remove-one";
				removeOne.dataset.productId = product.id;
				removeOne.setAttribute("aria-label", `Quitar una unidad de ${product.name}`);
				removeOne.textContent = "− 1";
				const removeAll = document.createElement("button");
				removeAll.type = "button";
				removeAll.dataset.cartAction = "remove-all";
				removeAll.dataset.productId = product.id;
				removeAll.setAttribute("aria-label", `Quitar ${product.name} del pedido actual`);
				removeAll.textContent = "Quitar";
				actions.append(removeOne, removeAll);
				item.append(actions);
			}
			cartItems.push(item);
		}
		itemsNode.replaceChildren();
		if (cartItems.length) itemsNode.append(...cartItems);
		else itemsNode.textContent = "Aún no agregas productos.";
		totalNode.textContent = money.format(total);
		saveButton.disabled = total === 0;
		for (const product of products) {
			const stockNode = grid.querySelector(`[data-stock="${product.id}"]`);
			stockNode.textContent = `${product.stock - (cart[product.id] || 0)} disponibles`;
			const button = grid.querySelector(`[data-add="${product.id}"]`);
			button.disabled = (cart[product.id] || 0) >= product.stock;
		}
	}

	itemsNode.addEventListener("click", (event) => {
		const actionButton = event.target.closest("[data-cart-action]");
		if (!actionButton || !account) return;
		if (!removeFromUserCart(account, actionButton.dataset.productId, actionButton.dataset.cartAction)) return;
		loadAccountCart(account);
		updateCart();
		updateAccountMenu();
	});

	for (const product of products) {
		const card = document.createElement("article");
		card.className = "product-card";
		card.id = `producto-${product.id}`;
		const photo = document.createElement("img");
		photo.className = "product-photo";
		photo.src = product.image;
		photo.alt = product.name;
		const copy = document.createElement("div");
		copy.className = "product-copy";
		const tag = document.createElement("span");
		tag.className = "product-tag";
		tag.textContent = product.tag;
		const title = document.createElement("h2");
		title.textContent = product.name;
		const description = document.createElement("p");
		description.textContent = product.description;
		const stock = document.createElement("p");
		stock.className = "product-stock";
		stock.dataset.stock = product.id;
		const controls = document.createElement("div");
		controls.className = "product-controls";
		const price = document.createElement("strong");
		price.textContent = money.format(product.price);
		const add = document.createElement("button");
		add.type = "button";
		add.className = "button button-dark";
		add.dataset.add = product.id;
		add.textContent = "Agregar";
		const quantityPicker = document.createElement("div");
		quantityPicker.className = "product-quantity-picker";
		quantityPicker.hidden = true;
		const quantityLabel = document.createElement("label");
		quantityLabel.htmlFor = `quantity-${product.id}`;
		quantityLabel.textContent = "Cantidad a agregar";
		const quantityInput = document.createElement("input");
		quantityInput.id = `quantity-${product.id}`;
		quantityInput.type = "number";
		quantityInput.min = "1";
		quantityInput.step = "1";
		quantityInput.value = "1";
		const quantityActions = document.createElement("div");
		quantityActions.className = "product-quantity-actions";
		const confirmAdd = document.createElement("button");
		confirmAdd.type = "button";
		confirmAdd.className = "button button-dark";
		confirmAdd.textContent = "Agregar al carrito";
		const cancelAdd = document.createElement("button");
		cancelAdd.type = "button";
		cancelAdd.className = "product-quantity-cancel";
		cancelAdd.textContent = "Cancelar";
		quantityActions.append(confirmAdd, cancelAdd);
		quantityPicker.append(quantityLabel, quantityInput, quantityActions);
		add.addEventListener("click", () => {
			const signedInAccount = getSignedInAccount();
			if (!signedInAccount) {
				window.location.href = "login.html?return=servicios.html";
				return;
			}
			if (account?.email !== signedInAccount.email) {
				loadAccountCart(signedInAccount);
				updateCart();
			}
			const stockAvailable = product.stock - (cart[product.id] || 0);
			const purchaseAvailable = getRemainingPurchaseLimit(signedInAccount, product.id) - (cart[product.id] || 0);
			if (purchaseAvailable <= 0) {
				feedback.textContent = "Cada usuario está limitado a solo comprar 5 unidades de cada producto.";
				return;
			}
			if (stockAvailable <= 0) {
				feedback.textContent = `No quedan unidades disponibles de ${product.name}.`;
				updateCart();
				return;
			}
			const available = Math.min(stockAvailable, purchaseAvailable);
			quantityInput.max = String(available);
			quantityInput.value = "1";
			quantityPicker.hidden = false;
			add.hidden = true;
			quantityInput.focus();
		});
		confirmAdd.addEventListener("click", () => {
			const quantity = Number(quantityInput.value);
			const stockAvailable = product.stock - (cart[product.id] || 0);
			const purchaseAvailable = getRemainingPurchaseLimit(getSignedInAccount(), product.id) - (cart[product.id] || 0);
			if (!Number.isInteger(quantity) || quantity < 1) {
				feedback.textContent = `Ingresa una cantidad entera entre 1 y ${Math.max(0, Math.min(stockAvailable, purchaseAvailable))}.`;
				quantityInput.focus();
				return;
			}
			if (quantity > purchaseAvailable) {
				feedback.textContent = "Cada usuario está limitado a solo comprar 5 unidades de cada producto.";
				quantityInput.focus();
				return;
			}
			if (quantity > stockAvailable) {
				feedback.textContent = `Ingresa una cantidad entera entre 1 y ${Math.max(0, stockAvailable)}.`;
				quantityInput.focus();
				return;
			}
			cart[product.id] = (cart[product.id] || 0) + quantity;
			saveUserCart();
			feedback.textContent = `${quantity} ${quantity === 1 ? "unidad agregada" : "unidades agregadas"} de ${product.name}.`;
			quantityPicker.hidden = true;
			add.hidden = false;
			updateCart();
			updateAccountMenu();
		});
		cancelAdd.addEventListener("click", () => {
			quantityPicker.hidden = true;
			add.hidden = false;
		});
		controls.append(price, add);
		copy.append(tag, title, description, stock, controls, quantityPicker);
		card.append(photo, copy);
		grid.append(card);
	}
	updateCart();
	if (location.hash.startsWith("#producto-")) {
		requestAnimationFrame(() => document.getElementById(decodeURIComponent(location.hash.slice(1)))?.scrollIntoView({ behavior: "smooth", block: "center" }));
	}
	window.addEventListener("wc-cart-updated", () => {
		const signedInAccount = getSignedInAccount();
		if (!signedInAccount || account?.email !== signedInAccount.email) return;
		loadAccountCart(signedInAccount);
		updateCart();
	});
	saveButton.addEventListener("click", () => {
		const signedInAccount = getSignedInAccount();
		if (!signedInAccount) {
			window.location.href = "login.html?return=servicios.html";
			return;
		}
		if (account?.email !== signedInAccount.email) {
			loadAccountCart(signedInAccount);
		}
		const exceedsUserLimit = products.some((product) => {
			return getPurchasedQuantity(signedInAccount, product.id) + (cart[product.id] || 0) > maxPerUser;
		});
		if (exceedsUserLimit) {
			feedback.textContent = "Cada usuario está limitado a solo comprar 5 unidades de cada producto.";
			return;
		}
		const items = products.filter((product) => cart[product.id]).map((product) => ({ id: product.id, name: product.name, quantity: cart[product.id], unitPrice: product.price, discount: cart[product.id] >= 3 ? 10 : 0 }));
		const total = items.reduce((sum, item) => sum + item.unitPrice * item.quantity * (1 - item.discount / 100), 0);
		const itemSummary = items.map((item) => `${item.name} × ${item.quantity}`).join(", ");
		const order = { id: `PED-${Date.now()}`, kind: "Pedido", date: new Date().toISOString(), customer: signedInAccount.name, email: signedInAccount.email, phone: "", detail: itemSummary, itemSummary, items, total, status: "Nuevo" };
		const orders = readStored(STORAGE.orders, []);
		orders.unshift(order);
		saveStored(STORAGE.orders, orders);
		saveStored(STORAGE.activeOrder, order);
		saveUserNotification(signedInAccount.email, {
			type: "purchase",
			title: "Compra hecha con éxito",
			message: `Tu pedido ${itemSummary} fue guardado por ${money.format(total)}.`
		});
		for (const item of items) {
			const product = products.find((entry) => entry.id === item.id);
			product.stock -= item.quantity;
		}
		saveStored(STORAGE.stock, Object.fromEntries(products.map((product) => [product.id, product.stock])));
		const storedCarts = readStored(STORAGE.carts, {});
		const carts = storedCarts && typeof storedCarts === "object" && !Array.isArray(storedCarts)
			? storedCarts
			: {};
		delete carts[signedInAccount.email];
		saveStored(STORAGE.carts, carts);
		feedback.textContent = "Pedido guardado. Puedes revisarlo en la página de inicio.";
		saveButton.disabled = true;
		for (const product of products) cart[product.id] = 0;
		updateCart();
		updateAccountMenu();
	});
}

if (document.body.dataset.page === "contact") {
	const contactForm = document.querySelector("#contact-form");
	const formError = document.querySelector("#form-error");
	const feedback = document.querySelector("#form-feedback");
	const adminPanel = document.querySelector("#admin-panel");
	const adminBody = document.querySelector("#orders-body");
	const adminEmpty = document.querySelector("#admin-empty");
	const usersBody = document.querySelector("#users-body");
	const usersEmpty = document.querySelector("#users-empty");
	const messageForm = document.querySelector("#admin-message-form");
	const messageFeedback = document.querySelector("#admin-message-feedback");
	const messageRecipient = document.querySelector("#admin-message-recipient");

	function renderUsers() {
		usersBody.replaceChildren();
		const storedAccounts = readStored(STORAGE.accounts, []);
		const accounts = Array.isArray(storedAccounts) ? storedAccounts : [];
		const selectedRecipient = messageRecipient.value;
		messageRecipient.replaceChildren();
		const allOption = document.createElement("option");
		allOption.value = "all";
		allOption.textContent = "Todos los usuarios";
		messageRecipient.append(allOption);
		usersEmpty.hidden = accounts.length > 0;
		for (const account of accounts) {
			const row = document.createElement("tr");
			for (const value of [account.name || "", account.username || "—", account.email || ""]) {
				const cell = document.createElement("td");
				cell.textContent = value;
				row.append(cell);
			}
			const recipientOption = document.createElement("option");
			recipientOption.value = account.email;
			recipientOption.textContent = `${account.name || account.username || account.email} (${account.email})`;
			messageRecipient.append(recipientOption);
			const actionCell = document.createElement("td");
			const remove = document.createElement("button");
			remove.type = "button";
			remove.className = "table-action";
			remove.textContent = "Eliminar cuenta";
			remove.addEventListener("click", () => {
				if (localStorage.getItem(STORAGE.admin) !== "true") return;
				if (!window.confirm(`¿Eliminar la cuenta de ${account.name || account.email}?`)) return;
				const remainingAccounts = readStored(STORAGE.accounts, []).filter((entry) => entry.email !== account.email);
				saveStored(STORAGE.accounts, remainingAccounts);
				for (const key of [STORAGE.carts, STORAGE.notifications]) {
					const stored = readStored(key, {});
					if (stored && typeof stored === "object" && !Array.isArray(stored)) {
						delete stored[account.email];
						saveStored(key, stored);
					}
				}
				if (readStored(STORAGE.userSession, null)?.email === account.email) {
					localStorage.removeItem(STORAGE.userSession);
				}
				renderUsers();
				updateAccountMenu();
			});
			actionCell.append(remove);
			row.append(actionCell);
			usersBody.append(row);
		}
		if (accounts.some((account) => account.email === selectedRecipient)) {
			messageRecipient.value = selectedRecipient;
		}
	}

	messageForm.addEventListener("submit", (event) => {
		event.preventDefault();
		if (localStorage.getItem(STORAGE.admin) !== "true") return;
		messageFeedback.textContent = "";
		const fields = new FormData(messageForm);
		const recipient = String(fields.get("recipient") || "");
		const type = String(fields.get("type") || "");
		const message = String(fields.get("message") || "").trim();
		const storedAccounts = readStored(STORAGE.accounts, []);
		const accounts = Array.isArray(storedAccounts) ? storedAccounts : [];
		const recipients = recipient === "all"
			? accounts
			: accounts.filter((account) => account.email === recipient);
		if (!message || !recipients.length) {
			messageFeedback.textContent = recipients.length ? "Escribe un mensaje antes de enviarlo." : "No hay cuentas para recibir esta notificación.";
			return;
		}
		const title = type === "promotion" ? "Promoción" : "Mensaje del administrador";
		for (const account of recipients) {
			saveUserNotification(account.email, { type, title, message });
		}
		messageFeedback.textContent = recipients.length === 1
			? "Notificación enviada a la bandeja del usuario."
			: `Notificación enviada a ${recipients.length} usuarios.`;
		messageForm.reset();
		updateAccountMenu();
	});

	function renderOrders() {
		adminBody.replaceChildren();
		const orders = readStored(STORAGE.orders, []);
		adminEmpty.hidden = orders.length > 0;
		for (const order of orders) {
			const row = document.createElement("tr");
			const values = [new Date(order.date).toLocaleDateString("es-CL"), order.customer, order.detail, money.format(order.total || 0)];
			for (const value of values) {
				const cell = document.createElement("td");
				cell.textContent = value;
				row.append(cell);
			}
			const statusCell = document.createElement("td");
			const statusSelect = document.createElement("select");
			statusSelect.setAttribute("aria-label", `Estado de ${order.id}`);
			for (const status of ["Nuevo", "En preparación", "Listo", "Entregado"]) {
				const option = document.createElement("option");
				option.value = status;
				option.textContent = status;
				option.selected = (order.status || "Nuevo") === status;
				statusSelect.append(option);
			}
			statusSelect.addEventListener("change", () => {
				const latestOrders = readStored(STORAGE.orders, []);
				const target = latestOrders.find((entry) => entry.id === order.id);
				if (target) target.status = statusSelect.value;
				saveStored(STORAGE.orders, latestOrders);
			});
			statusCell.append(statusSelect);
			row.append(statusCell);
			const actionCell = document.createElement("td");
			const remove = document.createElement("button");
			remove.type = "button";
			remove.className = "table-action";
			remove.textContent = "Eliminar";
			remove.addEventListener("click", () => {
				const latestOrders = readStored(STORAGE.orders, []).filter((entry) => entry.id !== order.id);
				saveStored(STORAGE.orders, latestOrders);
				if (readStored(STORAGE.activeOrder, null)?.id === order.id) localStorage.removeItem(STORAGE.activeOrder);
				renderOrders();
			});
			actionCell.append(remove);
			row.append(actionCell);
			adminBody.append(row);
		}
	}

	function showAdmin() {
		contactForm.hidden = true;
		adminPanel.hidden = false;
		renderOrders();
		renderUsers();
	}

	contactForm.addEventListener("submit", (event) => {
		event.preventDefault();
		formError.textContent = "";
		feedback.textContent = "";
		const fields = new FormData(contactForm);
		const name = String(fields.get("name") || "").trim();
		const email = String(fields.get("email") || "").trim();
		const phone = String(fields.get("phone") || "").trim();
		const goal = String(fields.get("goal") || "").trim();
		const message = String(fields.get("message") || "").trim();
		if (!name || !email || !phone || !goal) {
			formError.textContent = "Completa nombre, correo, teléfono y producto para continuar.";
			return;
		}
		if (isNaN(phone) || !/^\d{8,12}$/.test(phone)) {
			formError.textContent = "Ingresa un teléfono válido usando entre 8 y 12 números.";
			return;
		}
		if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			formError.textContent = "Ingresa un correo electrónico válido.";
			return;
		}
		const orders = readStored(STORAGE.orders, []);
		orders.unshift({ id: `SOL-${Date.now()}`, kind: "Solicitud", date: new Date().toISOString(), customer: name, email, phone, detail: `${goal}${message ? `: ${message}` : ""}`, total: 0, status: "Nuevo" });
		saveStored(STORAGE.orders, orders);
		feedback.textContent = `Gracias, ${name}. Registramos tu solicitud; pronto te escribiremos.`;
		contactForm.reset();
	});

	if (localStorage.getItem(STORAGE.admin) === "true") showAdmin();
	document.querySelector("#admin-logout").addEventListener("click", () => {
		localStorage.removeItem(STORAGE.admin);
		adminPanel.hidden = true;
		contactForm.hidden = false;
		updateAccountMenu();
	});
}

if (document.body.dataset.page === "finance") {
	const budgetInputs = ["domain-cost", "hosting-cost", "work-hours", "hour-rate"].map((id) => document.getElementById(id));
	const budgetTotal = document.querySelector("#budget-total");
	const budgetError = document.querySelector("#budget-error");
	const adsInputs = [document.querySelector("#cpc"), document.querySelector("#monthly-clicks")];
	const adsTotal = document.querySelector("#ads-total");
	const adsError = document.querySelector("#ads-error");
	const warning = document.querySelector("#ads-warning");

	function updateBudget() {
		const values = budgetInputs.map((input) => Number(input.value));
		if (budgetInputs.some((input) => input.value.trim() === "") || values.some((value) => isNaN(value) || value < 0)) {
			budgetError.textContent = "Usa valores numéricos iguales o mayores que cero.";
			return;
		}
		budgetError.textContent = "";
		budgetTotal.textContent = money.format(values[0] + values[1] + values[2] * values[3]);
	}
	function updateAds() {
		const values = adsInputs.map((input) => Number(input.value));
		if (adsInputs.some((input) => input.value.trim() === "") || values.some((value) => isNaN(value) || value < 0)) {
			adsError.textContent = "Ingresa costo por clic y cantidad de clics con valores válidos.";
			warning.hidden = true;
			return;
		}
		adsError.textContent = "";
		const monthlyCost = values[0] * values[1];
		adsTotal.textContent = money.format(monthlyCost);
		warning.textContent = "⚠️ Presupuesto de marketing alto para fase de lanzamiento";
		warning.hidden = monthlyCost <= 50000;
	}
	for (const input of budgetInputs) input.addEventListener("input", updateBudget);
	for (const input of adsInputs) input.addEventListener("input", updateAds);
	updateBudget();
	updateAds();
}
