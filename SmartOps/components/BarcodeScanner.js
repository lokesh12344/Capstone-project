import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Vibration } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { colors, font, radius, spacing } from '../src/theme';

export default function BarcodeScanner({ onScan, onClose, hint }) {
    const [permission, requestPermission] = useCameraPermissions();
    const [scanned, setScanned] = useState(false);

    useEffect(() => {
        if (!permission?.granted) requestPermission();
    }, []);

    async function handleScan({ data, type }) {
        if (scanned) return;
        setScanned(true);
        Vibration.vibrate(60);
        await onScan(data);
        // small delay before allowing next scan
        setTimeout(() => setScanned(false), 1200);
    }

    if (!permission?.granted) {
        return (
            <View style={s.permissionBox} >
                <Text style={s.permText}> Camera permission needed </Text>
                < TouchableOpacity style={s.permBtn} onPress={requestPermission} >
                    <Text style={s.permBtnText}> Allow camera </Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={s.wrapper} >
            <CameraView
                style={s.camera}
                onBarcodeScanned={scanned ? undefined : handleScan}
                barcodeScannerSettings={{
                    barcodeTypes: ['ean13', 'ean8', 'qr', 'code128', 'code39', 'upc_a', 'upc_e'],
                }
                }
            />

            {/* Scanning frame overlay */}
            <View style={s.overlay}>
                <View style={s.frameTop} />
                < View style={s.frameRow} >
                    <View style={s.frameSide} />
                    < View style={s.frame} >
                        <View style={[s.corner, s.tl]} />
                        < View style={[s.corner, s.tr]} />
                        <View style={[s.corner, s.bl]} />
                        < View style={[s.corner, s.br]} />
                        {scanned && <View style={s.scannedFlash} />}
                    </View>
                    < View style={s.frameSide} />
                </View>
                < View style={s.frameBottom} >
                    <Text style={s.hint}> {hint || 'Point at a barcode'}</Text>
                    < TouchableOpacity style={s.closeBtn} onPress={onClose} >
                        <Text style={s.closeBtnText}>✕  Close </Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
}

const CORNER = 22;
const CORNER_THICK = 3;

const s = StyleSheet.create({
    wrapper: { flex: 1, backgroundColor: '#000' },
    camera: { ...StyleSheet.absoluteFillObject },

    overlay: { flex: 1, flexDirection: 'column' },
    frameTop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    frameRow: { flexDirection: 'row', height: 220 },
    frameSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)' },
    frameBottom: { flex: 1.2, backgroundColor: 'rgba(0,0,0,0.55)', alignItems: 'center', paddingTop: 20, gap: 20 },

    frame: {
        width: 220, height: 220,
        position: 'relative',
    },
    scannedFlash: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: colors.teal + '55',
        borderRadius: 4,
    },

    corner: {
        position: 'absolute', width: CORNER, height: CORNER,
        borderColor: colors.teal, borderWidth: CORNER_THICK,
    },
    tl: { top: 0, left: 0, borderRightWidth: 0, borderBottomWidth: 0, borderTopLeftRadius: 4 },
    tr: { top: 0, right: 0, borderLeftWidth: 0, borderBottomWidth: 0, borderTopRightRadius: 4 },
    bl: { bottom: 0, left: 0, borderRightWidth: 0, borderTopWidth: 0, borderBottomLeftRadius: 4 },
    br: { bottom: 0, right: 0, borderLeftWidth: 0, borderTopWidth: 0, borderBottomRightRadius: 4 },

    hint: {
        color: colors.textSecondary, fontSize: font.md,
        letterSpacing: 0.3, textAlign: 'center',
    },
    closeBtn: {
        borderWidth: 1, borderColor: colors.border,
        borderRadius: radius.full,
        paddingHorizontal: spacing.xl, paddingVertical: spacing.sm,
    },
    closeBtnText: { color: colors.textPrimary, fontSize: font.sm, fontWeight: '600' },

    permissionBox: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: colors.bg, gap: 16,
    },
    permText: { color: colors.textSecondary, fontSize: font.md },
    permBtn: {
        backgroundColor: colors.teal, borderRadius: radius.md,
        paddingHorizontal: 24, paddingVertical: 12,
    },
    permBtnText: { color: colors.bg, fontWeight: '700' },
});