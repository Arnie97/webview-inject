package com.androidyuan.aesjni;

public class AESEncrypt {
    public static native int checkSignature(Object obj);

    public static native byte[] decKpQRcode(Object obj, String str, String str2, String str3);

    public static native String decode(Object obj, String str);

    public static native String encode(Object obj, String str);

    public static native byte[] encryptD(Object obj, String str, int i);

    public static native byte[] getLog(Object obj);

    public static native byte[] psamNo(Object obj);

    public static native byte[] tkdecode(Object obj, String str, int i);

    static {
        System.loadLibrary("JNIEncrypt");
    }
}
