package main

import (
	"testing"

	. "github.com/bjartek/overflow/v2"
	"github.com/fatih/color"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

// Full cover test suite for the whole app Flow

func TestFullFlow(t *testing.T) {
	o, err := OverflowTesting()
	require.NoError(t, err)
	require.NotNil(t, o)
	assert.NoError(t, err)

	color.White("STARTING DAO FLOW TEST")
	color.Green("GREEN transactions are meant to SUCCEED")
	color.Red("Red transactions are meant to FAIL")
	// User votes on the DAO's founders
	color.Green("Bob votes for the DAO's founder proposal")
	o.Tx("vote_founder",
		WithSigner("bob"),
		WithArg("topicId", 0),
		WithArg("options", `["bob", "alice"]`),
	).AssertSuccess(t).Print()
	// fetch the votes for the DAO's founder proposal
	color.Green("Fetch the votes for the DAO's founder proposal")
	o.Script("get_votes",
		WithArg("topicId", 0),
	)
	// Triger manual count of the votes
	color.Green("Trigger manual count of the votes")
	o.Tx("Admin/count_votes",
		WithSigner("account"),
		WithArg("topicId", 0),
	).AssertSuccess(t).Print()
	// As a founder, propose a new topic
	color.Green("Propose a new topic")
	o.Tx("propose_topic",
		WithSigner("bob"),
		WithArg("title", "Should we add a new feature to the DAO?"),
		WithArg("description", "We should add a new feature to the DAO to make it more efficient"),
		WithArg("options", `["yes", "no"]`),
	).AssertSuccess(t).Print()
	// As a member, vote on the new topic
	color.Green("Vote on the new topic")
	o.Tx("vote_topic",
		WithSigner("alice"),
		WithArg("topicId", 1),
		WithArg("option", 0),
	).AssertSuccess(t).Print()
	// Founder adds a new option to the topic
	color.Green("Add a new option to the topic")
	o.Tx("add_option",
		WithSigner("bob"),
		WithArg("topicId", 1),
		WithArg("option", "maybe"),
	).AssertSuccess(t).Print()
	// As a member, vote on the new option
	color.Green("Vote on the new option")
	o.Tx("vote_option",
		WithSigner("alice"),
		WithArg("topicId", 1),
		WithArg("option", 2),
	).AssertSuccess(t).Print()
	// Fetch the votes for the new topic
	color.Green("Fetch the votes for the new topic")
	o.Script("get_votes",
		WithArg("topicId", 1),
	)
	// Triger manual count of the votes
	color.Green("Trigger manual count of the votes")
	o.Tx("Admin/count_votes",
		WithSigner("account"),
		WithArg("topicId", 1),
	).AssertSuccess(t).Print()
}
