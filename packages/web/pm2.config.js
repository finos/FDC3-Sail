module.exports = {
    apps: [{
        name: "sail_web",
        script: "src/server/main.ts",
        interpreter: "tsx",
        env: {
            NODE_ENV: "production"
        },

    }]
}