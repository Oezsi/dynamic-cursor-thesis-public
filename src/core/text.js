/*
* text.js
*
* All participant-facing UI strings.
*/

export const texts = {
   title: "Dynamic Cursor Study",
   subtitle:
      "Introduction and Informed Consent • Researcher: Sinan Öz (Prof. Niels Henze), University of Tübingen",
   welcomeBody: [
      "In this study, you will complete a series of short pointing and steering tasks with the mouse cursor. On each trial you will move the cursor to a highlighted target or guide it through a narrow path, as quickly and accurately as possible. The study consists of multiple trials and takes approximately 20 minutes to complete.",
      "As stated in the task description on Prolific, you must use a Mac laptop and control the cursor with the built-in trackpad and open the study in a recent version of Google Chrome. Only take part if you are at least 18 years old. If you cannot meet these requirements, please return to Prolific.",
      "The study runs in fullscreen and must be completed in one sitting. If the browser leaves fullscreen mode or the window loses focus, please return to fullscreen and continue quickly from the screen shown.",

      "Data recorded:",
      {
         list: [
            "Prolific ID – used to identify your submission and pay you",
            "Age, gender, handedness and current input device",
            "Timestamps, cursor movements, click coordinates and the task condition of each trial",
            "Browser display information needed to interpret the data, including window size and device pixel ratio",
         ],
      },
      "The data will be used for scientific research on cursor design and pointer control. Results may be reported in publications, presentations, teaching and open research materials.",
      "Only anonymised data will be shared publicly.",
   ],

   continueButton: "Continue",

   phaseIntro: {
      fitts: {
         title: "Clicking targets",
         body:
            "You will see several circles arranged in a ring, with one circle highlighted in red at a time. Move the cursor to the highlighted circle and click it. As soon as you click, the next circle is highlighted, so you can work your way around the ring. Click as quickly as possible, but be sure to hit each circle accurately, speed and accuracy are equally important.",
      },
      steering: {
         title: "Steering through a tunnel",
         body:
            `You will see a straight tunnel formed by two walls. Move the cursor from the start of the tunnel (red line) to the far end (green line), staying between the walls the whole way. If you hit the walls, you must try again from the start of the tunnel. 
            Go as fast as you can while keeping the cursor inside the tunnel.`,
      },
   },

   demographics: {
      title: "Participant details",
      body:
         "Please fill out the needed information",

      ageLabel: "Age",
      ageBlockedNote:
         "You must be at least 18 years old to take part in this study. If you are not, please return to Prolific.",

      genderLabel: "Gender",
      genderOptions: ["Male", "Female", "Other", "Prefer not to say"],

      handednessLabel: "Handedness",
      handednessOptions: ["Right", "Left", "Ambidextrous"],

      inputDeviceLabel: "Current input device",
      inputDeviceOptions: ["Mouse", "Touchpad", "Other"],
      requiredInputDevice: "Touchpad",
      deviceBlockedNote:
         "This study can only be completed with a trackpad. If you are not using one, please return to Prolific.",

      consentLabel:
         "I have read the participant information on the previous page and consent to take part.",

      back: "Back",
      submit: "Start study",
   },

   survey: {
      title: "Rate the cursor",
      body:
         "Please rate the cursor you have just used. There are no right or wrong answers.",
      scalePoints: 7,
      lowAnchor: "Strongly disagree",
      highAnchor: "Strongly agree",
      submit: "Continue",
      items: [
         { id: "control", text: "I was in control of this cursor." },
         { id: "precision", text: "This cursor was precise." },
         { id: "speed", text: "This cursor was fast." },
         { id: "liking", text: "I liked this cursor." },
      ],
   },

   breakTitle: "Break",
   breakBody:
      "Continue whenever you are ready.",
   remaining: (n) => `Remaining: ${n} block(s).`,

   fullscreen: {
      title: "Fullscreen required",
      body:
         "This study must run in fullscreen mode. Please click the button below to continue in fullscreen.",
      restartNote:
         "The study must stay in fullscreen. If you leave it, please return here and continue.",
      button:
         "Enter fullscreen",
   },

   configError: {
      title: "Broken study link",
      body:
         "This studylink is incomplete and cannot be started",
      missing: (names) => `missing parameter: ${names.join(", ")
         }`,
   },

   endTitle: "All done",
   endBody:
      "Thank you for taking part. Your data is being submitted – please wait for the confirmation before returning to Prolific.",
   upload: {
      pending: "Submitting your data…",
      done: "Your data has been submitted. Please click the button below to complete the study on Prolific, otherwise your submission cannot be approved and paid.",
      completionButton: "Complete study on Prolific",
      errorTitle: "Submission failed",
      errorBody: "Your data could not be submitted. Please try again.",
      retryButton: "Try again",
   },
   continueHint: "Click to continue",
};
