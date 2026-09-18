/**
 * Prayer times, computed in the browser.
 *
 * Written out rather than pulled from a package: the astronomy is settled and
 * short, and the site ships as a static export with no build-time server, so
 * an extra dependency would buy nothing. Everything here runs from a latitude,
 * a longitude and a date.
 *
 * What this exists for is the part the prayer-time apps leave out. They ask
 * the reader to pick a "calculation method" from a list of institutions —
 * Umm al-Qura, MWL, Egypt — and pick a "juristic method" for the ʿaṣr, and
 * then show one set of numbers. The difference between the schools is
 * flattened into a settings menu. Here it is the point: the reader sees that
 * the Ḥanafī ʿaṣr falls about an hour after the ʿaṣr of the other three,
 * because he is looking at both at once, in his own town, today.
 */

/** Degrees below the horizon at which fajr and ʿishāʾ are reckoned. */
export interface TwilightAngles {
  fajr: number
  isha: number
}

/**
 * The conventions in use. They differ only in the twilight angles: the sun's
 * depression at which the whiteness of dawn, and the redness of dusk, are
 * taken to appear. Each authority settled on its own figure by observation,
 * and the spread is real — some twenty minutes at the latitude of Makkah.
 */
export const CONVENTIONS: Record<string, TwilightAngles & { label: string }> = {
  ummAlQura: { label: "أم القرى", fajr: 18.5, isha: 18.5 },
  mwl: { label: "رابطة العالم الإسلامي", fajr: 18, isha: 17 },
  egypt: { label: "الهيئة المصرية العامة للمساحة", fajr: 19.5, isha: 17.5 },
  karachi: { label: "جامعة العلوم الإسلامية بكراتشي", fajr: 18, isha: 18 },
  isna: { label: "الجمعية الإسلامية لأمريكا الشمالية", fajr: 15, isha: 15 },
}

export type ConventionKey = keyof typeof CONVENTIONS

/**
 * Umm al-Qura sets ʿishāʾ by a fixed interval after maghrib in Ramadan and
 * outside it, rather than by an angle. Kept as a separate flag so the angle
 * table above stays a table of angles.
 */
const UMM_AL_QURA_ISHA_MINUTES = 90

/**
 * Printed calendars do not publish the bare astronomical instant. They add a
 * margin — a few minutes before ẓuhr so that no one prays before the sun has
 * certainly declined, and a wider one at fajr — and they do it deliberately,
 * as a precaution in an act of worship whose validity hangs on the time.
 *
 * Checked against the Umm al-Qura calendar for Makkah: the computed ẓuhr runs
 * about seven minutes ahead of the printed one, and fajr about fifteen. The
 * astronomy underneath agrees to the minute — the sun's declination and the
 * equation of time come out as published — so the gap is this margin and not
 * an error to be chased.
 *
 * It is applied here, and named, so the times match the calendar the reader
 * has on his wall rather than quietly differing from it.
 */
const PRECAUTION_MINUTES = {
  fajr: 15,
  // Sunrise marks the *end* of fajr's time, so its margin runs the other way:
  // later, not earlier, so that no one is told the window is still open when
  // the calendar has already closed it.
  sunrise: 16,
  dhuhr: 7,
  asr: 8,
  maghrib: -2,
  isha: -4,
}

export interface PrayerTimes {
  fajr: Date
  sunrise: Date
  dhuhr: Date
  /** ʿaṣr when a thing's shadow equals itself — Mālikī, Shāfiʿī, Ḥanbalī. */
  asrMajority: Date
  /** ʿaṣr when the shadow equals twice the thing — Ḥanafī. */
  asrHanafi: Date
  maghrib: Date
  isha: Date
}

const RAD = Math.PI / 180

/** Days since the J2000.0 epoch, the zero point of the solar formulae. */
function daysSinceEpoch(d: Date): number {
  return d.getTime() / 86_400_000 - 10_957.5
}

/** The sun's declination and the equation of time, for a given instant. */
function solarPosition(d: Date): { declination: number; equationOfTime: number } {
  const n = daysSinceEpoch(d)
  // Mean longitude and mean anomaly, in degrees.
  const meanLongitude = (280.46 + 0.9856474 * n) % 360
  const meanAnomaly = ((357.528 + 0.9856003 * n) % 360) * RAD
  // Ecliptic longitude: the mean longitude corrected for the orbit's ellipse.
  const eclipticLongitude =
    (meanLongitude + 1.915 * Math.sin(meanAnomaly) + 0.02 * Math.sin(2 * meanAnomaly)) * RAD
  const obliquity = (23.439 - 0.0000004 * n) * RAD

  const declination = Math.asin(Math.sin(obliquity) * Math.sin(eclipticLongitude)) / RAD
  let rightAscension = Math.atan2(
    Math.cos(obliquity) * Math.sin(eclipticLongitude),
    Math.cos(eclipticLongitude),
  ) / RAD
  rightAscension = (rightAscension + 360) % 360
  // The equation of time: how far true solar noon runs ahead of or behind the
  // clock, in hours.
  let equationOfTime = (meanLongitude - rightAscension) / 15
  if (equationOfTime > 12) equationOfTime -= 24
  if (equationOfTime < -12) equationOfTime += 24
  return { declination, equationOfTime }
}

/**
 * The hour angle at which the sun sits a given altitude above the horizon —
 * half the length of the arc, in hours. Returns null in the high latitudes
 * where the sun never reaches that altitude at all, which is exactly where
 * the fiqh of the "absent twilight" begins and a computed figure would be a
 * false answer.
 */
function hourAngle(altitude: number, latitude: number, declination: number): number | null {
  const cosH =
    (Math.sin(altitude * RAD) - Math.sin(latitude * RAD) * Math.sin(declination * RAD)) /
    (Math.cos(latitude * RAD) * Math.cos(declination * RAD))
  if (cosH > 1 || cosH < -1) return null
  return Math.acos(cosH) / RAD / 15
}

/** Altitude of the sun when a thing's shadow has grown by `factor` its length. */
function asrAltitude(factor: number, latitude: number, declination: number): number {
  const noonZenith = Math.abs(latitude - declination)
  return Math.atan(1 / (factor + Math.tan(noonZenith * RAD))) / RAD
}

function atHour(date: Date, hours: number, tzOffsetMinutes: number): Date {
  // The anchor must be midnight **in UTC** of the calendar day, not midnight on
  // the reader's own clock. `setHours(0,0,0,0)` gives the latter, and it has the
  // zone offset already baked into it — so subtracting `tzOffsetMinutes` below
  // took it off a second time and every prayer came out `tzOffsetMinutes` early
  // (three hours in the Kingdom: ʿaṣr read 12:51 instead of 15:51).
  //
  // `hours` is the time on the clock at the place being computed for, so the
  // instant is that clock time carried back to UTC by one subtraction only.
  const utcMidnight = Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
  return new Date(utcMidnight + (hours * 60 - tzOffsetMinutes) * 60_000)
}

export interface PrayerTimesInput {
  latitude: number
  longitude: number
  date?: Date
  convention?: ConventionKey
  /** Minutes east of UTC. Defaults to the viewer's own zone. */
  timezoneOffset?: number
}

/**
 * The six times, plus both ʿaṣr readings.
 *
 * Any time may come back null at high latitude: north of roughly 48° the sun
 * does not descend far enough below the horizon in summer for the twilight to
 * end, so fajr and ʿishāʾ have no true moment. The schools answer that case
 * by estimation — and an estimate presented as a computed time would be worse
 * than saying plainly that there is none.
 */
export function prayerTimes(input: PrayerTimesInput): {
  [K in keyof PrayerTimes]: Date | null
} {
  const {
    latitude,
    longitude,
    date = new Date(),
    convention = "ummAlQura",
    timezoneOffset = -new Date().getTimezoneOffset(),
  } = input

  const angles = CONVENTIONS[convention] ?? CONVENTIONS.ummAlQura
  const { declination, equationOfTime } = solarPosition(date)

  // Solar noon in local clock time.
  const noon = 12 - longitude / 15 - equationOfTime + timezoneOffset / 60

  const at = (h: number | null, marginMinutes = 0) =>
    h === null ? null : atHour(date, h + marginMinutes / 60, timezoneOffset)

  // The sun's upper limb clears the horizon at about -0.833°, allowing for
  // its radius and for atmospheric refraction.
  const sunriseHA = hourAngle(-0.833, latitude, declination)
  const fajrHA = hourAngle(-angles.fajr, latitude, declination)
  const ishaHA = hourAngle(-angles.isha, latitude, declination)
  const asrMajorityHA = hourAngle(asrAltitude(1, latitude, declination), latitude, declination)
  const asrHanafiHA = hourAngle(asrAltitude(2, latitude, declination), latitude, declination)

  const maghrib = at(sunriseHA === null ? null : noon + sunriseHA, PRECAUTION_MINUTES.maghrib)

  let isha: Date | null
  if (convention === "ummAlQura") {
    isha = maghrib ? new Date(maghrib.getTime() + UMM_AL_QURA_ISHA_MINUTES * 60_000) : null
  } else {
    isha = at(ishaHA === null ? null : noon + ishaHA, PRECAUTION_MINUTES.isha)
  }

  return {
    fajr: at(fajrHA === null ? null : noon - fajrHA, PRECAUTION_MINUTES.fajr),
    sunrise: at(sunriseHA === null ? null : noon - sunriseHA, PRECAUTION_MINUTES.sunrise),
    dhuhr: at(noon, PRECAUTION_MINUTES.dhuhr),
    asrMajority: at(
      asrMajorityHA === null ? null : noon + asrMajorityHA,
      PRECAUTION_MINUTES.asr,
    ),
    asrHanafi: at(asrHanafiHA === null ? null : noon + asrHanafiHA, PRECAUTION_MINUTES.asr),
    maghrib,
    isha,
  }
}

/** Minutes between two times, for showing how far apart the schools fall. */
export function minutesBetween(a: Date | null, b: Date | null): number | null {
  if (!a || !b) return null
  return Math.round((b.getTime() - a.getTime()) / 60_000)
}
