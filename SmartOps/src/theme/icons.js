// Centralized icon system — every icon in the app is rendered through this one
// module, and every color it uses comes from `colors` (src/theme/index.js).
// That indirection is deliberate: when light mode is added later, only the
// `colors` palette needs to become theme-aware — nothing here, and nothing at
// any of the ~15 call sites across the app, has to change.
//
// One stroke weight app-wide ('regular'). Deliberate exceptions: tab-bar
// active state switches to 'fill' (a state indicator, not a second
// competing style), and an explicit `weight` override is available for the
// rare one-off that needs it (e.g. the FAB's plus, bolded for emphasis
// against a solid circle).
import React from 'react';
import {
    House, Package, HandCoins, Receipt, Plus,
    ArrowsClockwise, SignOut, Users, UserPlus,
    WarningCircle, TrendUp, ShoppingCart, Archive,
    Barcode, CheckCircle, WifiSlash, Flashlight, Keyboard,
    X, CaretRight, MapPin, Eye, EyeSlash,
    ShareNetwork, WhatsappLogo, Microphone, Truck, IdentificationBadge, Storefront,
    Phone, Prohibit, CloudCheck, CloudArrowUp, ClipboardText, PencilSimple,
} from 'phosphor-react-native';
import { colors } from './index';

const ICONS = {
    // Tab bar
    home: House,
    inventory: Package,
    khata: HandCoins,
    records: Receipt,
    // Actions
    newOrder: Plus,
    add: Plus,
    sync: ArrowsClockwise,
    logout: SignOut,
    customers: Users,
    addCustomer: UserPlus,
    alerts: WarningCircle,
    restock: TrendUp,
    cart: ShoppingCart,
    stockIn: Archive,
    scan: Barcode,
    allClear: CheckCircle,
    offline: WifiSlash,
    torch: Flashlight,
    keyboard: Keyboard,
    close: X,
    chevron: CaretRight,
    location: MapPin,
    show: Eye,
    hide: EyeSlash,
    share: ShareNetwork,
    whatsapp: WhatsappLogo,
    mic: Microphone,
    suppliers: Truck,
    staff: IdentificationBadge,
    shop: Storefront,
    phone: Phone,
    void: Prohibit,
    synced: CloudCheck,
    pending: CloudArrowUp,
    purchaseOrder: ClipboardText,
    edit: PencilSimple,
};

// Three sizes only: inline text/list rows, the bottom tab bar, and action chips
// (header buttons, cards) that need a slightly larger tap target.
const SIZES = { inline: 18, chip: 22, tabBar: 24 };

/**
 * <AppIcon name="khata" size="chip" active color={colors.teal} />
 *
 * - `active` switches weight to 'fill' (tab-bar selected state) — everywhere
 *   else stays 'regular'.
 * - `color` overrides the default; when omitted, active icons use the app's
 *   accent (teal) and inactive icons use muted text — both from `colors`.
 * - `weight` overrides the active-based default entirely, for the rare case
 *   that needs a specific stroke weight rather than a state indicator. Note
 *   'fill' isn't just "thicker" for every glyph — some render as a solid
 *   shape (e.g. Plus becomes a filled square with a cutout). Use 'bold' for
 *   "thicker but still an outline".
 */
export function AppIcon({ name, size = 'inline', active = false, color, weight }) {
    const Glyph = ICONS[name];
    if (!Glyph) {
        if (__DEV__) console.warn(`[AppIcon] Unknown icon name: "${name}"`);
        return null;
    }
    const resolvedColor = color || (active ? colors.teal : colors.textMuted);
    const resolvedSize = typeof size === 'number' ? size : (SIZES[size] ?? SIZES.inline);
    const resolvedWeight = weight || (active ? 'fill' : 'regular');

    return (
        <Glyph
            size={resolvedSize}
            color={resolvedColor}
            weight={resolvedWeight}
        />
    );
}

export { SIZES as ICON_SIZES };
