#include <WiFi.h>
#include <SPI.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <esp_sleep.h>
#include "FS.h"
#include "SPIFFS.h"
#include "ESPAsyncWebServer.h"
#include "AsyncJson.h"
#include "ArduinoJson.h"
#include "HTTPClient.h"
#include "WiFiClient.h"
#include "config.h"

#define SCREEN_WIDTH 128 // OLED display width, in pixels
#define SCREEN_HEIGHT 32 // OLED display height, in pixels

// Declaration for an SSD1306 display connected to I2C (SDA, SCL pins)
// The pins for I2C are defined by the Wire-library.
// On an arduino UNO:       A4(SDA), A5(SCL)
// On an arduino MEGA 2560: 20(SDA), 21(SCL)
// On an arduino LEONARDO:   2(SDA),  3(SCL), ...
#define OLED_RESET     -1 // Reset pin # (or -1 if sharing Arduino reset pin)
#define SCREEN_ADDRESS 0x3C ///< See datasheet for Address; 0x3D for 128x64, 0x3C for 128x32
Adafruit_SSD1306 display(SCREEN_WIDTH, SCREEN_HEIGHT, &Wire, OLED_RESET);
#define FORMAT_SPIFFS_IF_FAILED true

int LED_BLUE = 2;
int LED_INT = 1000;
int GPIO = 33;
int reading = 0;
int numberOfStars = 1;
int numberOfReadings = 0;

AsyncWebServer server(80);

String header;
// Current time
unsigned long currentTime = millis();
// Previous time
unsigned long previousReadingTime = 0;
unsigned long previousStarTime = 0;
// Define interval in milliseconds (example: 2000ms = 2s)
const long readingInterval = 1000*10;
const long starInterval = 1000;
const long restartAfterNumberOfReadings = 10;

void setup() {
  // put your setup code here, to run once:
  pinMode(LED_BLUE, OUTPUT);
  pinMode(GPIO, INPUT);
  reading = analogRead(GPIO);
  initDisplay();
}

void loop() {
  // put your main code here, to run repeatedly:
  currentTime = millis();
  if(currentTime - previousReadingTime > readingInterval){
    previousReadingTime = currentTime;

    reading = analogRead(GPIO);
    String stars = "";
    for(int i = 0; i < numberOfStars; i++){
      stars += "*";
    }
    drawOnScreen(String(reading)+" " +stars);
    numberOfReadings++;
    if(numberOfReadings > restartAfterNumberOfReadings){
      numberOfReadings = 0;
      ESP.restart();
    }
  }
  if(currentTime - previousStarTime > starInterval){
    previousStarTime = currentTime;
    String stars = "";
    for(int i = 0; i < numberOfStars; i++){
      stars += "*";
    }
    if(numberOfStars++ > 3){
      numberOfStars = 1;
    }
    drawOnScreen(String(reading)+" " +stars);
  }
  delay(1000);
}

int readAndPushReading(){
  int result = readReadings();
  if(result == 0){
    reading = analogRead(GPIO);
    delay(LED_INT);
    reading = analogRead(GPIO);
    drawOnScreen(String(reading));
    //writeReadings(reading, GPIO);
    delay(LED_INT);
  }
  return result;
}

void initWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WiFi_name, WiFi_pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
  }
  drawOnScreen(IpAddress2String(WiFi.localIP()));
}
void disconnectWiFi(){
  WiFi.disconnect(true);
  WiFi.mode(WIFI_OFF);
}

void initDisplay(){
  // SSD1306_SWITCHCAPVCC = generate display voltage from 3.3V internally
  if(!display.begin(SSD1306_SWITCHCAPVCC, SCREEN_ADDRESS)) {
    Serial.println(F("SSD1306 allocation failed"));
    for(;;); // Don't proceed, loop forever
  }

  // Show initial display buffer contents on the screen --
  // the library initializes this with an Adafruit splash screen.
  display.display();
  delay(2000); // Pause for 2 seconds
}

void initSPIFFS(){
  if(!SPIFFS.begin(FORMAT_SPIFFS_IF_FAILED)){
    drawOnScreen("failed to init SPIFFS");
  }
}

void drawOnScreen(String input) {
  display.clearDisplay();
  display.setTextSize(1);      // Normal 1:1 pixel scale
  display.setTextColor(SSD1306_WHITE); // Draw white text
  display.setCursor(0, 0);     // Start at top-left corner
  display.cp437(true);         // Use full 256 char 'Code Page 437' font

  int   ArrayLength  =input.length()+1;    //The +1 is for the 0x00h Terminator
  char  ip_char_array[ArrayLength];
  input.toCharArray(ip_char_array,ArrayLength);

  // Not all the characters will fit on the display. This is normal.
  // Library will draw what it can and the rest will be clipped.
  for(int16_t i=0; i<input.length(); i++) {
    display.write((int)ip_char_array[i]);
  }
  display.display();
}

String IpAddress2String(const IPAddress& ipAddress)
{
  return String(ipAddress[0]) + String(".") +\
  String(ipAddress[1]) + String(".") +\
  String(ipAddress[2]) + String(".") +\
  String(ipAddress[3])  ;
}

void initServer(){
  server.on("/", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(SPIFFS, "/index.html", String(), false);
  });
  server.on("/about", HTTP_GET, [](AsyncWebServerRequest *request){
    AsyncResponseStream *response = request->beginResponseStream("application/json");
    DynamicJsonBuffer jsonBuffer;
    JsonObject &root = jsonBuffer.createObject();
    root["heap"] = ESP.getFreeHeap();
    root["ssid"] = WiFi.SSID();
    root["reading"] = reading;
    root.printTo(*response);
    request->send(response);
  });
  server.on("/files", HTTP_GET, [](AsyncWebServerRequest *request){
    AsyncResponseStream *response = request->beginResponseStream("application/json");
    StaticJsonBuffer<500> jsonBuffer;
    // create an empty array
    JsonArray& root = jsonBuffer.createArray();
    String files[20];
    listFiles("/", files, 20);
    for(int i = 0; i < 20; i++){
      if(files[i].length() > 0){
        root.add(files[i]);
      }
    }
    drawOnScreen(String(root.size()));
    root.printTo(*response);
    request->send(response);
  });
  server.on("/testfile", HTTP_GET, [](AsyncWebServerRequest *request){
    request->send(SPIFFS, "/testfile.txt");
  });
  server.serveStatic("/", SPIFFS, "/").setDefaultFile("index.html");
  server.begin();
}

void listFiles(const char *dir, String * files, int size) {
  File root = SPIFFS.open(dir);
  if (!root) {
    return;
  }
  int index = 0;
  File file = root.openNextFile();
  while (file && index <size) {
    files[index++] = "File: " + String(file.name()) + ", Size: " + file.size();
    file = root.openNextFile();
  }
}

void writeReadings(int reading, int pin){
  File file = SPIFFS.open("/readings.txt", "w");
  if (!file) {
  } else {
    file.print(String(pin) + ";" + String(reading));
    file.close();
  }
}

int readReadings(){
  File file = SPIFFS.open("/readings.txt", "r");
  if (!file) {
    return 0;
  } else {
    String line = file.readString();
    file.close();
    if(line.length() < 3){
      return 0;
    }
    String pin = line.substring(0, 2);
    String reading = line.substring(3);
    //sendReadings(reading, pin);
    SPIFFS.remove("/readings.txt");
    return 1;
  }
}

void sendReadings(String reading, String pin){
  initWiFi();
  delay(LED_INT);
  WiFiClient client;
  HTTPClient http;
  String url = "http://192.168.1.131:8080/add-readings?pin="+pin+"&moisture="+reading;
  http.begin(client, url);
  http.GET();
  String result = http.getString();
  //drawOnScreen(url);
  http.end();
}
