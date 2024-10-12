// imports
const {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  Routes,
  REST,
} = require("discord.js");
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  NoSubscriberBehavior,
  AudioPlayerStatus,
  StreamType,
  getVoiceConnection,
} = require("@discordjs/voice");
const ytdl = require("@distube/ytdl-core");
const config = require("../config.json");
const Queue = require("./Queue.js");
const http = require("http");

// Cookie setup

const cookies = [
  {
    name: "cookie1",
    value: config.cookie1_value
  },
  {
    name: "cookie2",
    value: config.cookie2_value
  },
];

// Optional agent options (these are examples and can be adjusted as needed)
const agentOptions = {
  pipelining: 5,
  maxRedirections: 0
};

// Create the agent once
const agent = ytdl.createAgent(cookies, agentOptions);

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMembers,
  ],
});

// ready checks
client.once("ready", () => {
  console.log("Ready!");
});
client.on("error", console.error);
client.on("warn", console.warn);

// Define the slash commands
const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Plays audio from a YouTube link")
    .addStringOption((option) =>
      option
        .setName("url")
        .setDescription("The YouTube URL to play")
        .setRequired(true),
    ),
  new SlashCommandBuilder()
    .setName("disconnect")
    .setDescription("Disconnects the bot from the voice channel"),
  new SlashCommandBuilder()
    .setName("skibidi")
    .setDescription("Only use if you're sigma :nerd:"),
].map((command) => command.toJSON());

// Register slash commands
const rest = new REST({ version: "10" }).setToken(config.token);
(async () => {
  try {
    console.log("Deleting old application (/) commands.");
    const existingCommands = await rest.get(
      Routes.applicationGuildCommands(config.clientId, config.guildId),
    );
    let count = 0;
    for (const command of existingCommands) {
      await rest.delete(
        `${Routes.applicationGuildCommands(config.clientId, config.guildId)}/${command.id}`,
      );
      count++;
    }
    console.log(`Successfully deleted ${count} old application (/) commands.`);

    console.log("Started refreshing application (/) commands.");
    await rest.put(Routes.applicationGuildCommands(config.clientId, config.guildId), {
      body: commands,
    });
    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error(error);
  }
})();

// Create an audio player
const player = createAudioPlayer({
  behaviors: {
    noSubscriber: NoSubscriberBehavior.Pause,
  },
});

// Initialize the queue
const queue = new Queue();

// Handle interactions
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case "play": {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
          return interaction.reply({
            content: "You need to be in a voice channel to play music!",
            ephemeral: true,
          });
        }
      
        // Defer the reply immediately to extend the interaction time
        await interaction.deferReply();
      
        // Join the voice channel if not already connected
        let connection = getVoiceConnection(interaction.guild.id);
        if (!connection) {
          connection = joinVoiceChannel({
            channelId: voiceChannel.id,
            guildId: interaction.guild.id,
            adapterCreator: interaction.guild.voiceAdapterCreator,
          });
        }
      
        const url = interaction.options.getString("url");
        queue.enqueue(url);
        console.log(`Enqueued: ${url}`);
      
        if (
          player.state.status !== AudioPlayerStatus.Playing &&
          player.state.status !== AudioPlayerStatus.Buffering
        ) {
          // Start playing since the player is idle
          console.log(`Now playing ${url}!`);
          await play(interaction, connection, url);
        } else {
          console.log(`Added ${url} to queue!`);
          await interaction.editReply(`Added ${url} to queue!`);
        }
        break;
      }      
      case "disconnect": {
        const voiceChannel = interaction.member.voice.channel;
        if (!voiceChannel) {
          return interaction.reply({
            content: "You are not in a voice channel.",
            ephemeral: true,
          });
        }

        // Defer the reply
        await interaction.deferReply();

        // Disconnect the user
        if (voiceChannel) {
          await interaction.guild.members.cache
            .get(interaction.member.id)
            .voice.disconnect();
          await interaction.editReply("Disconnected from the voice channel.");
        } else {
          await interaction.editReply(
            "I am not connected to any voice channel.",
          );
        }
        break;
      }
      case "skibidi": {
        // Defer the reply
        await interaction.deferReply();

        const connection = getVoiceConnection(interaction.guild.id);
        if (connection) {
          queue.clear();
          connection.destroy();
          player.stop();
          await interaction.editReply("Disconnected from the voice channel.");
        } else {
          await interaction.editReply(
            "I am not connected to any voice channel.",
          );
        }
        break;
      }
      default:
        await interaction.reply({
          content: "Unknown command.",
          ephemeral: true,
        });
        break;
    }
  } catch (error) {
    console.error("Error handling interaction:", error);
    await interaction.reply("There was an error while executing this command.");
  }
});

// Function to play a song
async function play(interaction, connection, url) {
  try {
    const stream = await ytdl(url, {
      filter: "audioonly",
      highWaterMark: 1 << 25,
      agent,
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    player.play(resource);
    connection.subscribe(player);

    player.once(AudioPlayerStatus.Idle, () => {
      playNextInQueue(interaction, connection);
    });

    console.log(`Now playing ${url}!`);
    await interaction.editReply(`Now playing ${url}!`);
  } catch (error) {
    console.error("Error in audio player:", error);
    await interaction.editReply(`There was an error playing the URL: ${url}.`);
    playNextInQueue(interaction, connection); // Proceed to next song on error
  }
}

// Function to play the next song in the queue
async function playNextInQueue(interaction, connection) {
  if (player.state.status === AudioPlayerStatus.Playing || queue.isEmpty())
    return;

  const url = queue.dequeue();

  try {
    const stream = await ytdl(url, {
      filter: "audioonly",
      highWaterMark: 1 << 25,
      agent,
    });

    const resource = createAudioResource(stream, {
      inputType: StreamType.Arbitrary,
    });

    player.play(resource);
    connection.subscribe(player);

    player.once(AudioPlayerStatus.Idle, () => {
      playNextInQueue(interaction, connection);
    });

    console.log(`Now playing ${url}!`);
    await interaction.channel.send(`Now playing ${url}!`);
  } catch (error) {
    console.error("Error in audio player:", error);
    await interaction.channel.send(`There was an error playing the URL: ${url}.`);
    playNextInQueue(interaction, connection); // Attempt to play the next song
  }
}


// Handle audio player errors
player.on("error", (error) => {
  console.error("Error in audio player:", error);
});

// Login to Discord with token
client.login(config.token);

// Create a simple server to keep the bot alive
const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Discord bot is running\n");
});

const PORT = process.env.PORT || 3000; // Use PORT environment variable or default to 3000
server.listen(PORT, () => {
  console.log(`Server is listening on port ${PORT}`);
});
