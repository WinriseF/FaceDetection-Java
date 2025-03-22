package com.face.facedetection;

import org.opencv.core.*;
import org.opencv.imgcodecs.Imgcodecs;
import org.opencv.imgproc.Imgproc;
import org.opencv.objdetect.CascadeClassifier;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.util.ArrayList;
import java.util.List;

@RestController
public class FaceDetectionController {
    static {
        try {
            System.loadLibrary(Core.NATIVE_LIBRARY_NAME);
        } catch (UnsatisfiedLinkError e) {
            System.err.println("无法加载 OpenCV 本地库，请检查环境配置。");
            System.err.println(e);
        }
    }

    private CascadeClassifier faceDetector;
    private final String HAARCASCADE_PATH = "classpath:haarcascade_frontalface_alt.xml";

    public FaceDetectionController() {
        faceDetector = new CascadeClassifier(HAARCASCADE_PATH);
        if (faceDetector.empty()) {
            System.err.println("警告: 无法加载人脸检测分类器，请检查文件路径: " + HAARCASCADE_PATH);
        }
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE, produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Rect>> handleFileUpload(@RequestParam("file") MultipartFile file) {
        try {
            File tempFile = Files.createTempFile("uploaded_", ".jpg").toFile();
            file.transferTo(tempFile);
            List<Rect> faces = detectFaces(tempFile.getAbsolutePath());
            Files.delete(tempFile.toPath());
            return ResponseEntity.ok(faces);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().build();
        }
    }

    private List<Rect> detectFaces(String imagePath) {
        Mat image = Imgcodecs.imread(imagePath);
        Mat grayImage = new Mat();
        Imgproc.cvtColor(image, grayImage, Imgproc.COLOR_BGR2GRAY);

        MatOfRect faceDetections = new MatOfRect();
        faceDetector.detectMultiScale(grayImage, faceDetections, 1.1, 5, 0, new Size(30, 30), new Size());

        List<Rect> facesList = new ArrayList<>();
        for (Rect rect : faceDetections.toArray()) {
            facesList.add(rect);
        }
        return facesList;
    }
}
