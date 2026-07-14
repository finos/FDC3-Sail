

# **FDC3-Sail FAQ**

### **What is Sail and how does it relate to FDC3?**

Sail is a free, web-based simulator where people are able to test out the FDC3 rules in action. Imagine FDC3 as a rulebook on how applications should talk to each other, Sail is the digital practice field.

Sail lets anyone test drive 'dummy' apps inside a browser without having to download heavy software. This is especially useful for large organizations which want to test out FDC3, without implementing it.

### **What is FDC3 for exactly?**

FDC3 is designed to stop users having to manually copy and paste data between different programs in order to view information. It provides a universal language so that software which was previously blind to other apps, can now instantly share data and trigger actions across each other automatically.

### **What is a desktop agent?**

A desktop agent acts as a 'digital postman' running on your computer. Since individual applications are blind to each other, the agent sits in the middle, listening for data from App A and securely routing it to App B.

### **What is FINOS and the Linux Foundation?**

- The Linux Foundation is the world's largest non-profit group, helping industries and organizations to build free to use, open technology together.
- FINOS (the Fintech open source Foundation) is the financial branch of the Linux Foundation. They manage and protect the FDC3 standard.

### **How can beginners easily start to use FDC3 without prior knowledge about programming?**

Beginners do not need to code to use FDC3. It is normally built into many modern financial programs. As a user, all you need to do is to click applications and channels to link applications together. For example, click a stock ticker in the news app and watch as your other windows update automatically.

### **How can FDC3 benefit user experience?**

FDC3 makes working financially on a computer smooth and fast by doing the following:

- Removing double-typing, all you need to do is click once to update all of your apps.
- Reduces screen clutter, never again will you need to hunt through dozens of overlapping windows.
- Prevents mistakes by removing the chance for human error by copy and pasting the wrong numbers.

### **What will happen to my applications if I go offline?**

Since FDC3 does not rely on a cloud connection to pass messages, the desktop agent will run locally right on your computer. This means that open applications will continue to talk to each other and pass data continuously even if your internet drops out.

### **If one of my apps crashes, how would this affect my other apps?**

A single app crash would not affect/break your setup. This is due to FDC3 applications being loosely connected independent programs. E.g. if your charting app crashes, your news feed, chat window and other trading platforms will be able to continue to talk to each other completely unaffected.

### **How does FDC3 protect my financial data?**

FDC3 acts as a secure traffic controller. Applications cannot spy on your desktop or grab data from other platforms freely. Your sensitive information is only shared when you take a specific action, and modern FDC3 standards include digital signatures and private channels which ensure all data only goes to verified, trusted apps.

### **What devices can FDC3 be used on?**

FDC3 can be used on almost any standard office computer. It is built to be platform agnostic, meaning that it runs seamlessly across many operating systems.

### **How does Sail act as a 'sandbox'?**

Sail will run directly inside any ordinary browser. It creates an isolated, 'digital playground'. In this space developers and designers can drop in their new financial applications to see if they are able to follow the FDC3 rules correctly, basically seeing if their app is able to talk to other apps directly. It mimics a complex trader desktop without the need to install heavy, high-security corporate systems onto your device.

### **Why is it important to use Sail to test workflows?**

- Catching silent but harmful bugs: Financial workflows often will fail due to App A sending a message that App B cannot understand. Sail can be used to test this and catch these language barriers before they are implemented.
- Preventing expensive mistakes: An example of this would be a trader clicking a stock ticker and the wrong chart popping up, they could make an expensive mistake in this situation. Testing workflows using Sail ensure that clicking items will trigger the exact action wanted/required.
- Saving tech teams time: Testing software on a banking network is slow and frustrating. However, using Sail to test in a sandbox takes mere minutes, speeding up the process of these tools being built.

### **How can I add new applications into Sail?**

Firstly, let's talk about app directories. We can imagine these as an 'app store' for financial desktops. It acts as a central master list that tells the desktop agent exactly where each application lives, its name, and what kind of data it sends/receives.

To get Sail to recognise and display your app, you must register it into Sail's directory. Here are some steps:

- Open the directory file, and locate the master directory list used by Sail.
- Add your apps profile into the directory. The profile will include information about its name, URL, and the FDC3 rules it uses.
- Once added to the directory list, you are now able to launch and test your application within the Sail interface. It is ready to be linked up to other apps.

### **What do I need to do in order to create my own app which is compatible with FDC3?**

You are able to turn any basic financial web page into an FDC3 app by following these steps:

- Create your simple web page.
- Import the FDC3 rulebook. Do this by adding a small snippet of free code to your web page that links it to the official FDC3 library. This will instantly teach your web page how to understand the universal FDC3 language.
- Tell the app what to listen for. Write a few basic lines of instructions which will tell your app how to behave. This makes it compatible with FDC3.
