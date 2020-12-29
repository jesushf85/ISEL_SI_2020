package Utils;

import java.io.FileInputStream;
import java.security.KeyStore;
import java.security.KeyStoreException;
import java.security.NoSuchAlgorithmException;
import java.security.UnrecoverableKeyException;
import java.security.cert.CertificateFactory;
import java.security.cert.X509Certificate;

import javax.net.ssl.KeyManager;
import javax.net.ssl.KeyManagerFactory;
import javax.net.ssl.TrustManager;
import javax.net.ssl.TrustManagerFactory;

public class CertificateUtils {

    private CertificateUtils() {

    }

    public static TrustManager[] getTrustManagers() throws KeyStoreException, NoSuchAlgorithmException {
        TrustManagerFactory trustManagedFactory = TrustManagerFactory
                .getInstance(TrustManagerFactory.getDefaultAlgorithm());
        trustManagedFactory.init(getCustomCertificatesKeyStore());
        return trustManagedFactory.getTrustManagers();
    }

    public static KeyManager[] getKeyManagers(String pfxFileName, String password)
            throws NoSuchAlgorithmException, UnrecoverableKeyException, KeyStoreException
    {
        KeyManagerFactory keyManagerFactory = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm());
        keyManagerFactory.init(getPersonalCertificatesKeyStore(pfxFileName, password), password.toCharArray());
        return keyManagerFactory.getKeyManagers();
    }

    private static KeyStore getCustomCertificatesKeyStore()
    {
        String[] certFiles = new String[] {"CA1.cer","CA1-int.cer"};
        String certFilePath = System.getProperty("user.dir") + "\\Certificates\\";
        
        try {
            FileInputStream fileReader = null;

            // Creates a KeyStore
            KeyStore keyStore = KeyStore.getInstance("PKCS12");
            keyStore.load(null);

            for (String certFile : certFiles) 
            {
                fileReader = new FileInputStream(certFilePath + certFile);

                // Generates the X509Certificate for the loaded file.
                X509Certificate certificate = (X509Certificate)CertificateFactory.getInstance("X.509").generateCertificate(fileReader);

                // Adds the certificate to the KeyStore
                keyStore.setCertificateEntry("CA1", certificate);
            }

            return keyStore;
        }
        catch(Exception e)
        {
            System.out.println(e);
        }

        return null;
    }

    private static KeyStore getPersonalCertificatesKeyStore(String certFileName, String password)
    {
        String certFilePath = System.getProperty("user.dir") + "\\Certificates\\";

        try{
            FileInputStream fileReader = new FileInputStream(certFilePath + certFileName);

            // Creates KeyStore and loads PFX file into it
            KeyStore keyStore = KeyStore.getInstance("PKCS12");
            keyStore.load(fileReader, password.toCharArray());
            return keyStore;
        }
        catch(Exception e)
        {
            System.out.println(e);
        }

        return null;
    }
}
