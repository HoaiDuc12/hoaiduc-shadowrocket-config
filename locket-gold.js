// Experimental local Gold state. Does not create a server-side subscription.
// Skip requests when Locket cannot be identified from request headers.
(function () {
  try {
    var headers = $request.headers || {};
    var normalized = {};
    Object.keys(headers).forEach(function (key) {
      normalized[key.toLowerCase()] = String(headers[key]);
    });
    var isLocket = /locket/i.test(normalized['user-agent'] || '') ||
      /^com\.locket\.Locket$/i.test(normalized['x-client-bundle-id'] || '');
    if (!isLocket) {
      $done({});
      return;
    }
    if (typeof $response === 'undefined') {
      Object.keys(headers).forEach(function (key) {
        if (key.toLowerCase() === 'x-revenuecat-etag') delete headers[key];
      });
      $done({ headers: headers });
      return;
    }
    var data = JSON.parse($response.body);
    if (!data.subscriber || typeof data.subscriber !== 'object' || Array.isArray(data.subscriber)) {
      $done({});
      return;
    }
    var subscriber = data.subscriber;
    var entitlements = subscriber.entitlements;
    var subscriptions = subscriber.subscriptions;
    if ((entitlements && (typeof entitlements !== 'object' || Array.isArray(entitlements))) ||
        (subscriptions && (typeof subscriptions !== 'object' || Array.isArray(subscriptions)))) {
      $done({});
      return;
    }
    subscriber.entitlements = entitlements || {};
    subscriber.subscriptions = subscriptions || {};
    var existing = subscriber.entitlements.Gold || {};
    // Fallback follows the legacy Locket script supplied by the user.
    var product = existing.product_identifier || 'com.ohoang7.premium.yearly';
    var purchased = existing.purchase_date || new Date().toISOString();
    var expires = '2099-12-18T01:04:17Z';
    subscriber.entitlements.Gold = Object.assign({}, existing, {
      product_identifier: product,
      purchase_date: purchased,
      expires_date: expires,
      grace_period_expires_date: null
    });
    subscriber.subscriptions[product] = Object.assign({}, subscriber.subscriptions[product] || {}, {
      purchase_date: purchased,
      original_purchase_date: purchased,
      expires_date: expires,
      store: 'app_store',
      ownership_type: 'PURCHASED',
      period_type: 'normal',
      is_sandbox: false,
      billing_issues_detected_at: null,
      unsubscribe_detected_at: null,
      grace_period_expires_date: null
    });
    console.log('[HD Locket] Modified local Gold response');
    $done({ body: JSON.stringify(data) });
  } catch (error) {
    console.log('[HD Locket] Skipped: ' + error.message);
    $done({});
  }
})();
