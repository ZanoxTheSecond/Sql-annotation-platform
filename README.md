# Sql-annotation-platform

    Setup:
    
-create a google apps script project
-create the modify the code.gs file to be identical with the one from here
-create a .html file with the same name and content as the one from here
(you should, preferably, always run the main function which you modify to call the actual functions of interest)
(alternatively, if you run the 'timeMain' function, you can time how quickly the main function runs; the duration of the execution will we displayed in the Logger, accessible with Ctrl+Enter)

-customize the compareQueries function for sorting by difficulty (it returns negative when the arguments are already in the correct order)

-run the setupQueries function, giving an array of names of json files within the drive as an argument, as in: setupQueries(['train.json'])"
(note that the methods used to indentify the source files search throughout the entire drive, so, if you have multiple files with the same name, the script will choose one at random)
  -this function will create a folder names 'DATA' at the root of the drive and, within, one ore more batches of query (generally one, more only if the one would exceed 40MB in size)
  -the function will also store the id's of the folder and batches within the PropertiesService, so hypothetically, you can change the names, and even the location of these files without corrupting any of the ensuing processes)

-create a periodic trigger that calls the routine function, and runs every minute, as in: "ScriptApp.newTrigger('routine').timeBased().everyMinutes(1).create()"

-deploy the project as a web app, accessible to anyone and ran as if they were you.

That's it, the page should be operational. The users may add up to four entries to any query. Keep in mind that the actual dataset may only update when the routine function runs, and that only happens if the number of requests present in the PropertiesService has exceeded a certain capacity

==============================================================================================================================

    
