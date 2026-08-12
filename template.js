const computeEffectiveTldPlusOne = require('computeEffectiveTldPlusOne');
const getAllEventData = require('getAllEventData');
const getCookieValues = require('getCookieValues');
const getEventData = require('getEventData');
const getRequestHeader = require('getRequestHeader');
const getType = require('getType');
const JSON = require('JSON');
const logToConsole = require('logToConsole');
const makeInteger = require('makeInteger');
const parseUrl = require('parseUrl');
const sendHttpRequest = require('sendHttpRequest');
const setCookie = require('setCookie');

/*==============================================================================
==============================================================================*/

const eventData = getAllEventData();

if (shouldExitEarly(data, eventData)) return;

if (data.type === 'pageview') {
  const clickId = getClickIdFromQueryParams();
  if (!clickId) return data.gtmOnFailure();
  setClickIdCookie(data, clickId);
  return data.gtmOnSuccess();
} else if (data.type === 'conversion') {
  sendConversion(data);
}

if (data.useOptimisticScenario) {
  return data.gtmOnSuccess();
}

/*==============================================================================
  Vendor related functions
==============================================================================*/

function generateRequestUrl(data) {
  const baseUrl = 'https://a.mgid.com/postback/';
  const clientId = data.clientId;
  const eventName = data.eventName;
  const revenue = data.revenue;
  const clickId = getClickIdFromCookies() || getClickIdFromQueryParams();

  if (!isValidValue(clientId) || !isValidValue(eventName) || !isValidValue(clickId)) return null;

  return baseUrl + clientId + '?' + 'c=' + clickId + '&' + 'e=' + eventName + '&' + 'r=' + revenue;
}

function getClickIdFromQueryParams() {
  const location = parseUrl(eventData.page_location);
  const referer = parseUrl(getRequestHeader('referer'));
  const refererSearchParams = referer.searchParams;
  const locationSearchParams = location.searchParams;
  if (!refererSearchParams && !locationSearchParams) return null;
  const clickId =
    (refererSearchParams.adclida ? refererSearchParams[refererSearchParams.adclida] : null) ||
    (locationSearchParams.adclida ? locationSearchParams[locationSearchParams.adclida] : null) ||
    refererSearchParams.adclid ||
    locationSearchParams.adclid;

  return clickId;
}

function getClickIdFromCookies() {
  return getCookieValues('mgid_adclid')[0];
}

function setClickIdCookie(data, clickId) {
  if (!clickId) return;
  const cookieOptions = {
    domain: getCookieDomain(data),
    samesite: data.cookieSameSite || 'none',
    path: '/',
    secure: true,
    httpOnly: !!data.cookieHttpOnly,
    'max-age': 60 * 60 * 24 * (makeInteger(data.cookieExpiration) || 365)
  };
  setCookie('mgid_adclid', clickId, cookieOptions, false);
}

function sendConversion(data) {
  const requestUrl = generateRequestUrl(data);
  if (!requestUrl) {
    log({
      Name: 'MGID',
      Type: 'Message',
      EventName: 'Postback',
      Message: '🛑 [ERROR] Request was not sent.',
      Reason: 'Malformed URL. Missing required parameters'
    });
    return data.gtmOnFailure();
  }

  return sendHttpRequest(requestUrl)
    .then((response) => {
      if (!data.useOptimisticScenario) {
        return response.statusCode >= 200 && response.statusCode < 300
          ? data.gtmOnSuccess()
          : data.gtmOnFailure();
      }
    })
    .catch((error) => {
      if (!data.useOptimisticScenario) {
        return data.gtmOnFailure();
      }
    });
}

/*==============================================================================
  Helpers
==============================================================================*/

function getUrl(eventData) {
  return eventData.page_location || getRequestHeader('referer') || eventData.page_referrer;
}

function shouldExitEarly(data, eventData) {
  if (!isConsentGivenOrNotRequired(data, eventData)) {
    data.gtmOnSuccess();
    return true;
  }

  const url = getUrl(eventData);
  if (url && url.lastIndexOf('https://gtm-msr.appspot.com/', 0) === 0) {
    data.gtmOnSuccess();
    return true;
  }
}

function getCookieDomain(data) {
  return !data.cookieDomain || data.cookieDomain === 'auto'
    ? computeEffectiveTldPlusOne(getEventData('page_location') || getRequestHeader('referer')) ||
        'auto'
    : data.cookieDomain;
}

function isConsentGivenOrNotRequired(data, eventData) {
  if (data.adStorageConsent !== 'required') return true;
  if (eventData.consent_state) return !!eventData.consent_state.ad_storage;
  const xGaGcs = eventData['x-ga-gcs'] || ''; // x-ga-gcs is a string like "G110"
  return xGaGcs[2] === '1';
}

function isValidValue(value) {
  const valueType = getType(value);
  return valueType !== 'null' && valueType !== 'undefined' && value !== '' && value === value;
}

function log(rawDataToLog) {
  rawDataToLog.TraceId = getRequestHeader('trace-id');
  logToConsole(JSON.stringify(rawDataToLog));
}
