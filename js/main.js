var skills_hash = {};
var selected_class = "";
var skill_levels = {};
var skill_points_min_level = 4;
var skill_points_current = 0;
var skill_points_max = 69;
var shown_skill = "";

$(document).ready(function() {
	$("#skill-points-max").html(skill_points_max);
	$("#skill-points-cur").html(skill_points_current);
	
	$.ajax({
		type: "GET",
		url: "inc/skills.csv",
		dataType: "text",
		success: function(data) {parse_csv(data);}
	});
});

var parse_csv = function(data) {
	var data = $.csv.toObjects(data);
	$.each(data, function(item){
		if (skills_hash[this["Class"]] === undefined)
		{
			// Break skills down by tier, tree, and name - this allows us to more easily look them up later
			skills_hash[this["Class"]] = {};
			skills_hash[this["Class"]]["Tier"] = {};
			skills_hash[this["Class"]]["Tree"] = {};
			skills_hash[this["Class"]]["Skills"] = {};
		}
		// Define hashes/arrays as needed
		if (skills_hash[this["Class"]]["Tier"][this["Tier"]] === undefined)
			skills_hash[this["Class"]]["Tier"][this["Tier"]] = [];
		if (skills_hash[this["Class"]]["Tree"][this["Tree"]] === undefined)
		{
			skills_hash[this["Class"]]["Tree"][this["Tree"]] = {};
			skills_hash[this["Class"]]["Tree"][this["Tree"]]["Tier"] = [];
		}
		if (skills_hash[this["Class"]]["Tree"][this["Tree"]]["Tier"][this["Tier"]] === undefined)
			skills_hash[this["Class"]]["Tree"][this["Tree"]]["Tier"][this["Tier"]] = [];
		
		// Push the skills into their respective categories
		skills_hash[this["Class"]]["Skills"][this["Name"]] = this;
		skills_hash[this["Class"]]["Tier"][this["Tier"]].push(this);
		skills_hash[this["Class"]]["Tree"][this["Tree"]]["Tier"][this["Tier"]].push(this);
	});
	
	console.log(skills_hash);
	build_class_selector();
}

var build_class_selector = function() {
	// Get each of the classes and add them to the selector
	$.each(skills_hash, function(key){
		$("#class").append("<option value='" + key + "'>" + key + "</option>");
	});
	
	// Set the selected class to be the first value in the selector, then ensure that when the value changes we update the selected class
	selected_class = $("#class").find("option:first").val();
	$("#class").on("change", function(){
		update_class($(this).find("option:selected").val());
	});
	
	update_class(selected_class);
}

// Update all hashes and variables to a clean state
var update_class = function(cl) {
	selected_class = cl;
	skill_levels = {};
	$.each(skills_hash[selected_class]["Skills"], function(key){
		skill_levels[key] = 0;
	});
	console.log(skill_levels);
	skill_points_current = 0;
	$("#skill-points-cur").html(skill_points_current);
	build_tree();
}

var build_tree = function() {
	// This is -1 because we have an "Initial" tree which isn't an actual tree
	var table_width = Object.keys(skills_hash[selected_class]["Tree"]).length - 1;
	
	// Blank out the current build table
	$("#build-table").html("");
	
	// Build out the first row
	var initial_skill = skills_hash[selected_class]["Tree"]["Initial"]["Tier"][0][0];
	$("#build-table").append("<tr><td colspan='" + table_width + "'><div class='skill' name='" + initial_skill["Name"] + "'>" + initial_skill["Name"] + "<br/><p class='level'></p></div></td></tr>");
	
	// Get the skill trees and remove the Initial entry
	var skill_trees = [];
	$.each(Object.keys(skills_hash[selected_class]["Tree"]), function(){
		if (this != "Initial")
			skill_trees.push(this);
	});
	
	// Get the number of skill tiers
	var skill_tiers = 0;
	$.each(skills_hash[selected_class]["Tree"][skill_trees[0]]["Tier"], function(){
		skill_tiers++;
	});
	
	// Now build rows for each of the other skills
	for (var row=0; row <= skill_tiers; row++) {
		var skill_row = "<tr>";
		if (row == 0)
		{
			$.each(skill_trees, function(){
				skill_row += "<td>" + this + "</td>";
			});
		}
		else
		{
			$.each(skill_trees, function(){
				skill_row += "<td>";
				$.each(skills_hash[selected_class]["Tree"][this]["Tier"][row], function(){
					skill_row += "<div class='skill' name='" + this["Name"] + "'>" + this["Name"] + "<br/><p class='level'></p></div>";
				});
				skill_row += "</td>";
			});
		}
		skill_row += "</tr>";
		$("#build-table").append(skill_row);
	}
	
	// Now that the tree is built, add the on-hover event for the skills to show their info and clear it accordingly
	$(".skill").on("mouseenter", function(){
		show_skill(skills_hash[selected_class]["Skills"][$(this).attr("name")]);
	});
	$(".skill").on("click", function(e){
		improve_skill(skills_hash[selected_class]["Skills"][$(this).attr("name")]);
	});
	$(".skill").on("contextmenu", function(e){
		e.preventDefault();
		reduce_skill(skills_hash[selected_class]["Skills"][$(this).attr("name")]);
		return false;
	});
	$(".skill").on("mouseleave", function(){
		clear_skill();
	});
}

// Show the selected skill in the top portion of the page
var show_skill = function(selected_skill) {
	shown_skill = selected_skill["Name"];
	var selected_skill_level = skill_levels[selected_skill["Name"]];
	// Set the labels
	if (selected_skill_level > 0)
		$("#skill-current-label").html("At current skill level: ");
	if ((selected_skill["Tree"] == "Initial" && selected_skill_level == 1) || selected_skill_level == 5)
		$("#skill-next-label").html("Skill at maximum level!");
	else if ((selected_skill["Tree"] != "Initial" && selected_skill_level < 1) || selected_skill_level < 5)
		$("#skill-next-label").html("At next skill level: ");
	// Set the skill info
	$("#skill-description").html(selected_skill["Description"]);
	$("#skill-current-effect").html(build_improvement(selected_skill, selected_skill_level));
	if (selected_skill["Tree"] == "Initial" && selected_skill_level < 1)
		$("#skill-next-effect").html(build_improvement(selected_skill, selected_skill_level+1));
	else if (selected_skill["Tree"] != "Initial" && selected_skill_level < 5)
		$("#skill-next-effect").html(build_improvement(selected_skill, selected_skill_level+1));
}

// Clear the top portion of the page
var clear_skill = function() {
	$("#skill-info p").html("");
	shown_skill = "";
}

// Level up a skill after passing all checks and balances
var improve_skill = function(skill) {
	// If it's a tier 0 skill, it cannot exceed level 1
	if (
		((skill["Tier"] == 0 && skill_levels[skill["Name"]] != 1) || 
		(skill["Tier"] != 0 && skill_levels[skill["Name"]] != 5 && check_prerequisites(skill))) &&
		skill_points_current < skill_points_max) {
		
		skill_levels[skill["Name"]]++;
		skill_points_current++;
		$("#skill-points-cur").html(skill_points_current);
		$(".skill[name='" + skill["Name"] + "'] .level").html("Level " + skill_levels[skill["Name"]]);
		if (skill_levels[skill["Name"]] < 5 && !$(".skill[name='" + skill["Name"] + "']").hasClass("skill-improved"))
			$(".skill[name='" + skill["Name"] + "']").addClass("skill-improved");
		else if (skill_levels[skill["Name"]] == 5 && !$(".skill[name='" + skill["Name"] + "']").hasClass("skill-maxed"))
		{
			$(".skill[name='" + skill["Name"] + "']").removeClass("skill-improved");
			$(".skill[name='" + skill["Name"] + "']").addClass("skill-maxed");
		}
		clear_skill();
		show_skill(skill);
	}
}

// Returns true if the tier before the skill has sufficient levels to allow this skill to levels up
var check_prerequisites = function(skill) {
	// Instantly allow the skill to be leveled up if it is the root skill
	if (skill["Tree"] == "Initial")
		return true;
	else
	{
		// If this is a tier 1 skill, check if the root skill is leveled
		if (skill["Tier"] == 1)
		{
			var prev_tier_val = 0;
			$.each(skills_hash[selected_class]["Tier"][parseInt(skill["Tier"])-1], function(){
				prev_tier_val += skill_levels[this["Name"]];
			});
			return prev_tier_val == 1;
		}
		// Otherwise, check all the previous tier's skills and make sure their total levels is at least 5
		else
		{		
			var prev_tier_val = 0;
			$.each(skills_hash[selected_class]["Tree"][skill["Tree"]]["Tier"][parseInt(skill["Tier"])-1], function(){
				prev_tier_val += skill_levels[this["Name"]];
			});
			return prev_tier_val >= 5;
		}
	}
}

// Reduce a skill's level after passing all checks and balances
var reduce_skill = function(skill) {
	// Verify that the skill can be removed - basically, you need 5 points in a specific tier to unlock the next one.
	// Do not allow a skill to be leveled down if it has skills further down the tree depending on it
	if (skill_levels[skill["Name"]] != 0 && check_dependencies(skill)) {
		skill_levels[skill["Name"]]--;
		skill_points_current--;
		$("#skill-points-cur").html(skill_points_current);
		if (skill_levels[skill["Name"]] > 0)
		{
			$(".skill[name='" + skill["Name"] + "'] .level").html("Level " + skill_levels[skill["Name"]]);
			if (!$(".skill[name='" + skill["Name"] + "']").hasClass("skill-improved"))
			{
				$(".skill[name='" + skill["Name"] + "']").removeClass("skill-maxed");
				$(".skill[name='" + skill["Name"] + "']").addClass("skill-improved");
			}
		}
		else if (skill_levels[skill["Name"]] == 0)
		{
			$(".skill[name='" + skill["Name"] + "']").removeClass("skill-improved");
			$(".skill[name='" + skill["Name"] + "'] .level").html("");
		}
		clear_skill();
		show_skill(skill);
	}
}

// Returns true if no other skills depend on this skill being at its current level
var check_dependencies = function(skill) {
	if (skill["Tree"] == "Initial")
	{
		// If this is the initial skill, if any other skill has a single level, this skill cannot be removed
		var skill_levels_other = 0;
		$.each(skill_levels, function(sk) {
			if (sk != skill["Name"])
				skill_levels_other += this;
		});
		return skill_levels_other == 0;
	}
	else
	{
		// Calculate the value of all skills at this tier
		var current_tier_val = 0;
		$.each(skills_hash[selected_class]["Tree"][skill["Tree"]]["Tier"][skill["Tier"]], function(){
			current_tier_val += skill_levels[this["Name"]];
		});
		// Calculate the value of all skills above this tier
		var next_tier_val = 0;
		$.each(skills_hash[selected_class]["Tree"][skill["Tree"]]["Tier"][parseInt(skill["Tier"])+1], function(){
			next_tier_val += skill_levels[this["Name"]];
		});
		
		// If the next tier has levels, let's use some logic here
		if (next_tier_val > 0)
			return current_tier_val > 5 && next_tier_val > 0;
		else
			return true;
	}
}

// Based on the Improvement string of a skill, fill it with values from the specified level of the skill
var build_improvement = function(skill, level) {
	// A level 0 skill is nothing
	if (level == 0)
		return "";
	else
	{
		// If there are multiple things that get improved, the level of the skill will also have multiple values.
		// In that case, apply them to the attributes and combine into a string
		if (skill["Improvement"].includes("/"))
		{
			var skill_improvements = skill["Improvement"].split("/");
			var skill_effects = skill["Level " + level].split("/");
			var skill_replaced = []
			for (var i=0; i < skill_improvements.length; i++) {
				skill_replaced[i] = skill_improvements[i].replace("X", skill_effects[i]);
			}
			return skill_replaced.join(", ");
		}
		// If there's just one improvement, simply do the string replacement and display
		else
			return skill["Improvement"].replace("X", skill["Level " + level]);
	}
}