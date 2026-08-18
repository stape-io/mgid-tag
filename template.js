const computeEffectiveTldPlusOne = require('computeEffectiveTldPlusOne');
const encodeUriComponent = require('encodeUriComponent');
const getAllEventData = require('getAllEventData');
const getCookieValues = require('getCookieValues');
const getEventData = require('getEventData');
const getRequestHeader = require('getRequestHeader');
const getType = require('getType');
const JSON = require('JSON');
const makeString = require('makeString');
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
  const clickId = getClickIdFromQueryParams(eventData);
  setClickIdCookie(data, clickId);
  return data.gtmOnSuccess();
} else if (data.type === 'conversion') {
  const requestData = mapRequestData(data, eventData);
  const invalidReason = validateRequestBody(requestData);
  if (invalidReason) {
    log({
      Name: 'MGID',
      Type: 'Message',
      EventName: 'Postback',
      Message: '🛑 [ERROR] Request was not sent.',
      Reason: invalidReason
    });
    return data.gtmOnFailure();
  }
  sendConversion(data, requestData);
}

if (data.useOptimisticScenario) {
  return data.gtmOnSuccess();
}

/*==============================================================================
  Vendor related functions
==============================================================================*/

function mapRequestData(data, eventData) {
  const requestData = {
    clientId: data.clientId,
    eventName: data.eventName,
    clickId: data.clickId || getClickIdFromQueryParams(eventData) || getClickIdFromCookies()
  };

  if (isValidValue(data.revenue)) {
    requestData.revenue = data.revenue;
  }

  return requestData;
}

function validateRequestBody(requestData) {
  const missing = [];
  if (!isValidValue(requestData.clientId)) missing.push('Client ID');
  if (!isValidValue(requestData.eventName)) missing.push('Event Name');
  if (!isValidValue(requestData.clickId)) missing.push('Click ID');

  if (missing.length > 0) {
    return 'Missing required parameters: ' + missing.join(', ');
  }
}

function generateRequestUrl(requestData) {
  const baseUrl = 'https://a.mgid.com/postback/';

  return (
    baseUrl +
    enc(requestData.clientId) +
    '?c=' +
    enc(requestData.clickId) +
    '&e=' +
    enc(requestData.eventName) +
    (isValidValue(requestData.revenue) ? '&r=' + enc(requestData.revenue) : '') +
    '&m=stape-sgtm'
  );
}

function getClickIdFromQueryParams(eventData) {
  const searchParamsFromMultipleSources = [
    eventData.page_location,
    eventData.page_referrer,
    getRequestHeader('referer')
  ]
    .filter((url) => !!url)
    .map(parseUrl)
    .filter((url) => !!url)
    .map((url) => url.searchParams);

  for (const searchParams of searchParamsFromMultipleSources) {
    if (getType(searchParams.adclid) === 'string') return searchParams.adclid;
    const aliasKey = searchParams.adclida;
    if (getType(aliasKey) === 'string' && getType(searchParams[aliasKey]) === 'string') {
      return searchParams[aliasKey];
    }
  }
  return null;
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

function sendConversion(data, requestData) {
  const requestUrl = generateRequestUrl(requestData);

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

function enc(data) {
  if (['null', 'undefined'].indexOf(getType(data)) !== -1) data = '';
  return encodeUriComponent(makeString(data));
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
