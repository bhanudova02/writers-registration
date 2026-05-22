export const normalizeTitle = (value) => value.trim().toLowerCase().replace(/\s+/g, ' ');

export function loadRazorpayCheckout() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) {
      resolve(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.onload = () => resolve(true);
    script.onerror = () => reject(new Error('Unable to load Razorpay Checkout. Please check your internet connection.'));
    document.body.appendChild(script);
  });
}
