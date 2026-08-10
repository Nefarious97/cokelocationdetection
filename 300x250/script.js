// App State
let STORES_DB = [];
let selectedStore = null;
let directionsUrl = "";
let currentUserCoords = null;
let AREA_NAME = "YABA"; // Area name shown on page 1
const FALLBACK_URL = "https://digitaltribe.ng/2026/coke/coke75/3dcarousel/320x480/index.html";

// DOM Elements
const bannerEl = document.getElementById("banner-click");
const storeNameEl = document.getElementById("store-name");
const storeContainer = document.querySelector(".store-name-container");
const gpsIndicator = document.getElementById("gps-indicator");
const radarBtn = document.getElementById("radar-btn");
const nearOverlay = document.getElementById("near-overlay");
const nearBackBtn = document.getElementById("near-back-btn");
const nearBody = document.getElementById("near-body");
const dtLogoBtn = document.getElementById("dt-logo-btn");

// Load store data from agege.json then initialise the banner
window.addEventListener("DOMContentLoaded", () => {
    fetch("agege.json")
        .then(res => res.json())
        .then(data => {
            STORES_DB = data.stores;

            // Default fallback to first YABA store
            selectedStore = STORES_DB.find(s => s.area === "YABA") || STORES_DB[0];
            AREA_NAME = selectedStore.area || "YABA";

            updateStoreUI(AREA_NAME);
            bindEvents();
            autoDetectLocation();
        })
        .catch(err => {
            console.error("Failed to load store database:", err);
        });
});

function bindEvents() {
    // 1. Entire banner click opens Page 2 (Closest 3 Stores Overlay)
    bannerEl.addEventListener("click", () => {
        openClosestStoresOverlay();
    });

    // 2. Location radar icon click also opens Page 2
    radarBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        openClosestStoresOverlay();
    });

    // 3. Bind overlay back button to return to Page 1
    nearBackBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        closeClosestStoresList();
    });

    // 4. Intercept clicks on overlay body to prevent accidental bubbling
    nearOverlay.addEventListener("click", (e) => {
        e.stopPropagation();
    });

    // 5. DT Logo click — open Digital Tribe agency site
    dtLogoBtn.addEventListener("click", (e) => {
        e.stopPropagation();
        window.open("https://www.digitaltribe.com.ng", "_blank");
    });
}

// ── Haversine Distance Formula ──────────────────────────────────────────────
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

// Find nearest retail outlet from coordinates
function findNearestStore(lat, lng) {
    let minDistance = Infinity;
    let nearest = null;
    STORES_DB.forEach(store => {
        const dist = calculateDistance(lat, lng, store.lat, store.lng);
        if (dist < minDistance) {
            minDistance = dist;
            nearest = store;
        }
    });
    return nearest;
}

// Sort database and return top 3 closest outlets
function getTopClosestStores(lat, lng, count = 3) {
    return [...STORES_DB].map(store => ({
        ...store,
        distance: calculateDistance(lat, lng, store.lat, store.lng)
    })).sort((a, b) => a.distance - b.distance).slice(0, count);
}

// Update Page 1 Area Name UI with smooth animation
function updateStoreUI(name) {
    storeContainer.style.opacity = 0;
    storeContainer.style.transform = "scale(0.95)";
    setTimeout(() => {
        storeNameEl.textContent = name;
        storeContainer.style.opacity = 1;
        storeContainer.style.transform = "scale(1)";
    }, 250);
}

// Silent location auto-detection on load
function autoDetectLocation() {
    if ("geolocation" in navigator) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                currentUserCoords = { lat, lng };

                const nearest = findNearestStore(lat, lng);
                if (nearest) {
                    selectedStore = nearest;
                    AREA_NAME = nearest.area;
                    updateStoreUI(AREA_NAME);
                    if (gpsIndicator) gpsIndicator.className = "gps-indicator success";

                    const dist = calculateDistance(lat, lng, nearest.lat, nearest.lng);
                    if (dist > 5) {
                        try {
                            window.open(FALLBACK_URL, "_top");
                        } catch (e) {
                            window.location.href = FALLBACK_URL;
                        }
                        return;
                    }
                }
            },
            (error) => {
                console.warn("Auto-location failed/denied:", error);
                if (gpsIndicator) gpsIndicator.className = "gps-indicator error";
            },
            { enableHighAccuracy: true, timeout: 6000, maximumAge: 60000 }
        );
    } else {
        if (gpsIndicator) gpsIndicator.className = "gps-indicator error";
    }
}

// ── Open Page 2 (Closest 3 Stores Overlay) OR Redirect if > 5km ─────────────
function openClosestStoresOverlay() {
    if (currentUserCoords) {
        const nearest = findNearestStore(currentUserCoords.lat, currentUserCoords.lng);
        if (nearest) {
            const dist = calculateDistance(currentUserCoords.lat, currentUserCoords.lng, nearest.lat, nearest.lng);
            if (dist > 5) {
                window.open(FALLBACK_URL, "_blank");
                return;
            }
        }
        buildAndShowOverlay(3);
    } else if ("geolocation" in navigator) {
        if (gpsIndicator) gpsIndicator.className = "gps-indicator";
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                currentUserCoords = { lat, lng };

                const nearest = findNearestStore(lat, lng);
                if (nearest) {
                    selectedStore = nearest;
                    AREA_NAME = nearest.area;
                    updateStoreUI(AREA_NAME);
                    if (gpsIndicator) gpsIndicator.className = "gps-indicator success";

                    const dist = calculateDistance(lat, lng, nearest.lat, nearest.lng);
                    if (dist > 5) {
                        window.open(FALLBACK_URL, "_blank");
                        return;
                    }
                }
                buildAndShowOverlay(3);
            },
            (error) => {
                if (gpsIndicator) gpsIndicator.className = "gps-indicator error";
                buildAndShowOverlay(3);
            },
            { enableHighAccuracy: true, timeout: 5000, maximumAge: 60000 }
        );
    } else {
        buildAndShowOverlay(3);
    }
}

// ── Build and display closest store cards on Page 2 ────────────────────────
function buildAndShowOverlay(count = 3) {
    // Default fallback to YABA coordinates (RAYSHE STORE)
    const activeLat = currentUserCoords ? currentUserCoords.lat : 6.50776;
    const activeLng = currentUserCoords ? currentUserCoords.lng : 3.36776;
    const topStores = getTopClosestStores(activeLat, activeLng, count);

    nearBody.innerHTML = "";

    topStores.forEach(store => {
        const card = document.createElement("div");
        card.className = "near-card";
        card.innerHTML = `
            <div class="near-card-left">
                <div class="near-card-name">${store.name}</div>
                <div class="near-card-area">${store.area}</div>
            </div>
            <div class="near-card-arrow">&rarr;</div>
        `;

        card.addEventListener("click", (e) => {
            e.stopPropagation();
            selectedStore = store;

            const startOrigin = currentUserCoords ? `${currentUserCoords.lat},${currentUserCoords.lng}` : "";
            const googleUrl = startOrigin
                ? `https://www.google.com/maps/dir/?api=1&origin=${startOrigin}&destination=${store.lat},${store.lng}&travelmode=driving`
                : `https://www.google.com/maps/dir/?api=1&destination=${store.lat},${store.lng}&travelmode=driving`;

            window.open(googleUrl, "_blank");
            closeClosestStoresList();
        });

        nearBody.appendChild(card);
    });

    nearOverlay.classList.add("active");
}

// Close Page 2 overlay and return to Page 1
function closeClosestStoresList() {
    nearOverlay.classList.remove("active");
}