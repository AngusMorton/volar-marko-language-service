import { type FeatureConfig } from "src/feature/FeatureConfig";
import { registerOnConsent } from "src/utils/tcfApi";

export type GaTag = "UA-22361422-1" | "UA-22361422-3";

// Add type definitions for the window properties GA gives us:
// https://developers.google.com/tag-platform/security/guides/privacy#turn-off-analytics
type WindowKey = `ga-disable-${GaTag}`;
declare global {
  interface Window extends Record<WindowKey, boolean | undefined> {}
}

const GOOGLE_UNIFIED_ANALYTICS_CONSENT_PURPOSES_REQUIRED = [1, 8, 9, 10];
const GOOGLE_UNIFIED_ANALYTICS_LEGITIMATE_INTEREST_PURPOSES_REQUIRED: number[] =
  [];

export interface State {
  gaProperty: GaTag | undefined;
  wasGivenConsent: boolean;
}

export default class extends Marko.Component<{}, State> {
  onCreate(_input: {}, out: Marko.Out<any>) {
    const googleAnalyticsFeature = (out.global.featureConfig as FeatureConfig)
      .GoogleAnalytics;
    this.state = {
      gaProperty: getGaProperty(googleAnalyticsFeature),
      wasGivenConsent: false,
    };
  }

  onMount() {
    // Storing as const here so that registerOnConsent doesn't get a potentially undefined value
    const gaProperty = this.state.gaProperty;
    if (gaProperty === undefined) {
      return;
    }

    registerOnConsent(
      () => {
        // Note: We never unset this property, as removing the script from the DOM doesn't stop ga from tracking.
        this.state.wasGivenConsent = true;
        // Un-disable the analytics, in case they were disabled by a prior revocation
        window[`ga-disable-${gaProperty}`] = false;
      },
      () => (window[`ga-disable-${gaProperty}`] = true),
      GOOGLE_UNIFIED_ANALYTICS_CONSENT_PURPOSES_REQUIRED,
      GOOGLE_UNIFIED_ANALYTICS_LEGITIMATE_INTEREST_PURPOSES_REQUIRED,
    );
  }
}

export function getGaProperty(
  feature: FeatureConfig["GoogleAnalytics"],
): GaTag | undefined {
  switch (feature) {
    case "Production":
      return "UA-22361422-1";
    case "Test":
      return "UA-22361422-3";
    case "Disabled":
    default:
      return undefined;
  }
}
