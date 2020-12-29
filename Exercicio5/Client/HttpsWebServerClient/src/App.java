import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.io.PrintWriter;
import java.io.UncheckedIOException;
import java.security.SecureRandom;
import java.util.stream.Collectors;

import javax.net.ssl.SSLContext;
import javax.net.ssl.SSLSocket;
import javax.net.ssl.SSLSocketFactory;

import Utils.CertificateUtils;

public class App {

    private static final String SITE_URL = "www.secure-server.edu";
    private static final String PFX_FILE = "Carol_1.pfx";
    private static final String PFX_PASSWORD = "changeit";

    public static void main(String[] args) throws Exception {

        try {
        var sslContext = SSLContext.getInstance("TLS");
        sslContext.init(CertificateUtils.getKeyManagers(PFX_FILE, PFX_PASSWORD), CertificateUtils.getTrustManagers(), new SecureRandom());

        SSLSocketFactory sslSocketFactory = sslContext.getSocketFactory();  
        SSLSocket socket = (SSLSocket) sslSocketFactory.createSocket(SITE_URL, 4433);

        PrintWriter out = new PrintWriter(socket.getOutputStream());
        out.write("GET " + "/" + " HTTP/1.0\r\n\r\n");
        out.flush();

        BufferedReader in = new BufferedReader(new InputStreamReader(socket.getInputStream()));

        System.out.println(in.lines().collect(Collectors.joining()));
        }
        catch(UncheckedIOException sslE)
        {
            System.out.println(">>>>> # # # Error connecting to remote server # # #: " + sslE);
        }
        catch (Exception e)
        {
            System.out.println(e);
        }
        //System.out.println(socket.getSession().getPeerCertificates()[0]);
    }
}
