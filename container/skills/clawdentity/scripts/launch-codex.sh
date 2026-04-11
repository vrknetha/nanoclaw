#!/bin/bash
# Launch Codex in tmux session for Clawdentity work
# Usage: ./launch-codex.sh "<task prompt>"

set -e

SESSION="clagram"
WORKDIR="/Users/ravikiranvemula/Workdir/clawdentity"

# Check tmux session exists
if ! tmux has-session -t "$SESSION" 2>/dev/null; then
    tmux new-session -d -s "$SESSION" -c "$WORKDIR"
    echo "Created tmux session: $SESSION"
fi

TASK="${1:-}"
if [ -z "$TASK" ]; then
    echo "Usage: $0 '<task prompt>'"
    echo "Example: $0 'Implement webhook channel for NanoBot'"
    exit 1
fi

# Launch Codex with xhigh reasoning in full-auto
tmux send-keys -t "$SESSION" "cd $WORKDIR && npx -y @openai/codex@latest -c model_reasoning_effort=xhigh --full-auto \"$TASK\"" Enter

echo "Codex launched in tmux session: $SESSION"
echo "Monitor: tmux capture-pane -t $SESSION -p | tail -20"
