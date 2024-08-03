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
int GPIO = 34;
int reading = 0;

AsyncWebServer server(80);

String header;
// Current time
unsigned long currentTime = millis();
// Previous time
unsigned long previousTime = 0;
// Define interval in milliseconds (example: 2000ms = 2s)
const long readingInterval = 1000*60;

void setup() {
  // put your setup code here, to run once:
  pinMode(LED_BLUE, OUTPUT);

  initDisplay();
  initWiFi();
  initSPIFFS();
  initServer(); 
}

void loop() {
  // put your main code here, to run repeatedly:
  currentTime = millis();
  if(currentTime - previousTime > readingInterval){
    previousTime = currentTime;
    digitalWrite(LED_BLUE, HIGH);  // turn the LED on (HIGH is the voltage level)
    delay(LED_INT);
    digitalWrite(LED_BLUE, LOW);   // turn the LED off by making the voltage LOW
    delay(LED_INT);
    reading = analogRead(GPIO);
    drawOnScreen(String(reading));
    sendReadings(reading, GPIO);
    delay(LED_INT);
  }
  delay(10000);
}

void initWiFi() {
  WiFi.mode(WIFI_STA);
  WiFi.begin(WiFi_name, WiFi_pass);
  while (WiFi.status() != WL_CONNECTED) {
    delay(1000);
  }
  drawOnScreen(IpAddress2String(WiFi.localIP()));
  server.begin();
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
  delay(2000);
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
  String reading_s = String(reading);
  File file = SPIFFS.open("/readings.txt", "a");
  if (!file) {
  } else {
    file.print("hello, test 1");
    file.close();
  }
}

void sendReadings(int reading, int pin){
  if(reading <= 0){
    return;
  }
  WiFiClient client;
  HTTPClient http;
  String url = "http://192.168.1.131:8080/add-readings?pin="+String(pin)+"&moisture="+String(reading);
  http.begin(client, url);
  http.GET();
  String result = http.getString();
  drawOnScreen(url);
  http.end();
}
