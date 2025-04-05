package com.face.facedetection;

import org.bytedeco.javacpp.Loader;
import org.bytedeco.opencv.global.opencv_imgcodecs;
import org.bytedeco.opencv.global.opencv_imgproc;
import org.bytedeco.opencv.opencv_objdetect.CascadeClassifier;
import org.bytedeco.opencv.opencv_core.Mat;
import org.bytedeco.opencv.opencv_core.Rect;
import org.bytedeco.opencv.opencv_core.RectVector;
import org.bytedeco.opencv.opencv_core.Size;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import java.io.InputStream;
import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardCopyOption;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
public class FaceDetectionController {

    private CascadeClassifier faceDetector;
    private final String HAARCASCADE_CLASSPATH = "/haarcascade_frontalface_alt.xml";

    public FaceDetectionController() {
        try {
            Loader.load(org.bytedeco.opencv.global.opencv_objdetect.class);

            InputStream cascadeStream = getClass().getResourceAsStream(HAARCASCADE_CLASSPATH);
            if (cascadeStream == null) {
                throw new IllegalStateException("无法从 classpath 加载 " + HAARCASCADE_CLASSPATH);
            }
            Path tempCascadeFile = Files.createTempFile("haarcascade", ".xml");
            Files.copy(cascadeStream, tempCascadeFile, StandardCopyOption.REPLACE_EXISTING);
            cascadeStream.close();

            faceDetector = new CascadeClassifier(tempCascadeFile.toAbsolutePath().toString());
            if (faceDetector.isNull()) {
                System.err.println("警告: 无法加载人脸检测分类器，请检查文件路径: " + tempCascadeFile.toAbsolutePath());
            }
        } catch (IOException e) {
            System.err.println("加载级联文件失败: " + e.getMessage());
        }
    }

    @PostMapping(value = "/upload",
            consumes = MediaType.MULTIPART_FORM_DATA_VALUE,
            produces = MediaType.APPLICATION_JSON_VALUE)
    public ResponseEntity<List<Map<String, Integer>>> handleFileUpload(@RequestParam("file") MultipartFile file) {
        try {
            File tempFile = Files.createTempFile("uploaded_", ".jpg").toFile();
            file.transferTo(tempFile);
            List<Rect> faces = detectFaces(tempFile.getAbsolutePath());
            Files.delete(tempFile.toPath());

            List<Map<String, Integer>> facesListForJson = new ArrayList<>();
            for (Rect face : faces) {
                Map<String, Integer> faceInfo = new HashMap<>();
                faceInfo.put("x", face.x());
                faceInfo.put("y", face.y());
                faceInfo.put("width", face.width());
                faceInfo.put("height", face.height());
                facesListForJson.add(faceInfo);
            }

            return ResponseEntity.ok(facesListForJson);
        } catch (IOException e) {
            e.printStackTrace();
            return ResponseEntity.badRequest().build();
        }
    }

    private List<Rect> detectFaces(String imagePath) {
        // 读取图片
        Mat image = opencv_imgcodecs.imread(imagePath);
        Mat grayImage = new Mat();
        opencv_imgproc.cvtColor(image, grayImage, opencv_imgproc.COLOR_BGR2GRAY);

        // 进行人脸检测
        RectVector faceDetections = new RectVector();
        faceDetector.detectMultiScale(grayImage, faceDetections, 1.1, 5, 0, new Size(30, 30), new Size());

        List<Rect> facesList = new ArrayList<>();
        for (int i = 0; i < faceDetections.size(); i++) {
            facesList.add(faceDetections.get(i));
        }
        return facesList;
    }
}