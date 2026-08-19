# MGID tag for Google Tag Manager Server Container

The **MGID tag** for Google Tag Manager Server Container lets you integrate MGID tracking with your server-side setup sending conversions directly to the [MGID Postabck](https://help.mgid.com/postback-tracking-method).

## Features

- **Page View Tracking:** Stores the Click ID (`mgid_adclid`) in a cookie to be used later for Conversion Postback events.
- **Conversion Tracking:** Postbacks a conversion directly to your MGID Ad account using the specified Event Name, Revenue/Value, and MGID Client ID.

## Tag Configuration

- **To set up a Pageview Tag:** Select **Page View** as the Event Type. This tag captures and stores your MGID Click ID in a cookie (`mgid_adclid`) so it can be referenced later for conversions. You can optionally adjust the **Cookie Settings** to define the Cookie Expiration (defaults to 365 days), Cookie Domain, Cookie SameSite, and Http Only Flag.

- **To set up a Conversion Tag:** Select **Conversion Track** as the Event Type to send a conversion back to your MGID Ad account. Under the **Conversion Data** settings, you must provide your MGID Client ID and Event Name. Revenue is optional. Click ID is also optional — if not provided, it will automatically be retrieved from the query parameters or from the `mgid_adclid` cookie set by the Page View event.

## Useful Resources

- [MGID Postback documentation](https://help.mgid.com/postback-tracking-method)

## Open Source

MGID tag for GTM Server Side is developed and maintained by [Stape Team](https://stape.io/) under the Apache 2.0 license.

### GTM Gallery Status
🔴 Not listed
